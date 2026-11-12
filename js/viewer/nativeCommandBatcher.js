// Use the existing CootWorker command-list protocol, retaining individual native
// message IDs, callbacks, journaling and activeMessages. No extra WASM instance.
const COMMANDS = new Set([
  'delete_colour_rules',
  'shim_set_bond_colours',
  'add_colour_rule',
  'add_colour_rules_multi',
  'get_colour_rules',
  'get_bonds_mesh_instanced',
  'get_bonds_mesh_for_selection_instanced'
]);
const transports = new WeakMap();

// A shared Coot worker gets one transport wrapper even if more than one adapter
// owns it. Each adapter releases its lease after its own native work drains.
export const acquireNativeCommandBatcher = worker => {
  let entry = transports.get(worker);
  if (!entry) {
    entry = { batcher: new NativeCommandBatcher(worker), users: 0 };
    transports.set(worker, entry);
  }
  entry.users++;
  let released = false;
  return {
    register: molNo => entry.batcher.register(molNo),
    dispose: async () => {
      if (released) return;
      released = true;
      entry.users--;
      if (entry.users === 0) {
        await entry.batcher.dispose(() => entry.users === 0);
        if (entry.users === 0) transports.delete(worker);
      }
    }
  };
};

export class NativeCommandBatcher {
  constructor(worker) {
    this.worker = worker;
    this.scopes = new Map();
    this.queue = [];
    this.inFlight = new Map();
    this.singles = new Map();
    this.sequence = 0;
    this.post = worker.postMessage;
    this.receive = worker.onmessage;
    this.terminate = worker.terminate;
    this.postWrapper = (message, transfer) => {
      if (this.fatal) {
        this.fail([message], this.fatal);
        return;
      }
      if (
        message.message === 'coot_command' &&
        COMMANDS.has(message.command) &&
        this.scopes.has(message.commandArgs?.[0]) &&
        transfer == null &&
        typeof window !== 'undefined' &&
        typeof window.structuredClone === 'function'
      ) {
        // postMessage normally snapshots its arguments immediately. Do the same
        // before deferring this small serializable command envelope.
        try {
          this.queue.push(window.structuredClone(message));
        } catch (error) {
          this.fail([message], error);
          return;
        }
        if (this.queue.length >= 8) this.flush();
        else if (this.timer == null) this.timer = setTimeout(() => this.flush(), 0);
      } else {
        // Non-batched work is an ordering barrier, including native deletion.
        this.flush();
        this.post.call(worker, message, ...(transfer ? [transfer] : []));
      }
    };
    this.receiveWrapper = event => {
      const batch = this.inFlight.get(event.data?.messageId);
      if (!batch) {
        const single = this.singles.get(event.data?.messageId);
        if (single) {
          this.singles.delete(event.data.messageId);
          if (event.data.result?.status === 'Exception')
            this.markFailed(single.item, new Error(event.data.consoleMessage || 'Coot command failed'));
        }
        try {
          return this.receive.call(worker, event);
        } finally {
          single?.resolve();
        }
      }
      this.inFlight.delete(event.data.messageId);
      const results = event.data.resultList;
      let notificationError;
      if (
        !Array.isArray(results) ||
        results.length !== batch.items.length ||
        results.some((result, index) => result?.messageId !== batch.items[index].messageId)
      ) {
        notificationError = this.fail(batch.items, new Error('Invalid Coot command batch reply'));
      } else {
        notificationError = this.forward(batch.items, results);
      }
      batch.resolve();
      if (notificationError) throw notificationError;
    };
    this.onError = event => {
      this.fatal =
        event?.error instanceof Error
          ? event.error
          : new Error(event?.message || 'Coot worker failed during command batching');
      clearTimeout(this.timer);
      this.timer = null;
      this.fail(this.queue.splice(0), this.fatal);
      this.singles.forEach(single => {
        this.fail([single.item], this.fatal);
        single.resolve();
      });
      this.singles.clear();
      this.inFlight.forEach(batch => {
        this.fail(batch.items, this.fatal);
        batch.resolve();
      });
      this.inFlight.clear();
    };
    worker.postMessage = this.postWrapper;
    worker.onmessage = this.receiveWrapper;
    this.terminateWrapper = (...args) => {
      this.onError();
      return this.terminate.apply(worker, args);
    };
    if (this.terminate) worker.terminate = this.terminateWrapper;
    worker.addEventListener?.('error', this.onError);
    worker.addEventListener?.('messageerror', this.onError);
  }

  register(molNo) {
    const scope = { failure: this.fatal };
    if (!this.scopes.has(molNo)) this.scopes.set(molNo, new Set());
    this.scopes.get(molNo).add(scope);
    return {
      assertHealthy: () => {
        if (this.fatal || scope.failure) throw this.fatal || scope.failure;
      },
      release: () => {
        const scopes = this.scopes.get(molNo);
        scopes?.delete(scope);
        if (!scopes?.size) this.scopes.delete(molNo);
      }
    };
  }

  markFailed(message, error) {
    this.scopes.get(message.commandArgs?.[0])?.forEach(scope => {
      scope.failure = scope.failure || error;
    });
  }

  fail(items, error) {
    items.forEach(item => this.markFailed(item, error));
    return this.forward(
      items,
      items.map(item => ({
        messageId: item.messageId,
        myTimeStamp: item.myTimeStamp,
        messageTag: 'result',
        consoleMessage: error.message,
        result: { status: 'Exception' }
      }))
    );
  }

  forward(items, results) {
    let notificationError;
    results.forEach((result, index) => {
      if (result.result?.status === 'Exception')
        this.markFailed(items[index], new Error(result.consoleMessage || 'Coot command failed'));
      try {
        this.receive.call(this.worker, new MessageEvent('message', { data: result }));
      } catch (error) {
        this.markFailed(items[index], error);
        notificationError = notificationError || error;
      }
    });
    return notificationError;
  }

  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.queue.length) return;
    const items = this.queue.splice(0, 8);
    if (items.length === 1) {
      let resolve;
      const promise = new Promise(accept => {
        resolve = accept;
      });
      this.singles.set(items[0].messageId, { item: items[0], resolve, promise });
      try {
        this.post.call(this.worker, items[0]);
      } catch (error) {
        this.singles.delete(items[0].messageId);
        this.fail(items, error);
        resolve();
      }
    } else {
      const messageId = `fragalysis-coot-batch-${++this.sequence}`;
      let resolve;
      const promise = new Promise(accept => {
        resolve = accept;
      });
      this.inFlight.set(messageId, { items, resolve, promise });
      try {
        this.post.call(this.worker, { message: 'coot_command_list', messageId, commandList: items });
      } catch (error) {
        this.inFlight.delete(messageId);
        this.fail(items, error);
        resolve();
      }
    }
    if (this.queue.length) this.flush();
  }

  async dispose(canRestore = () => true) {
    this.flush();
    await Promise.all([...this.inFlight.values(), ...this.singles.values()].map(batch => batch.promise));
    if (!canRestore()) return;
    if (this.worker.postMessage === this.postWrapper) this.worker.postMessage = this.post;
    if (this.worker.onmessage === this.receiveWrapper) this.worker.onmessage = this.receive;
    if (this.worker.terminate === this.terminateWrapper) this.worker.terminate = this.terminate;
    this.worker.removeEventListener?.('error', this.onError);
    this.worker.removeEventListener?.('messageerror', this.onError);
    this.scopes.clear();
  }
}
