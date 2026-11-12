import fs from 'fs';
import { runInNewContext } from 'vm';
import { serialize, deserialize } from 'v8';
import ts from 'typescript';
import { NativeCommandBatcher, acquireNativeCommandBatcher } from './nativeCommandBatcher';

const installedCommandCentre = () => {
  const bundle = fs.readFileSync(require.resolve('moorhen'), 'utf8');
  const marker = bundle.lastIndexOf('sourceMappingURL=data:');
  const map = JSON.parse(Buffer.from(bundle.slice(bundle.indexOf('base64,', marker) + 7), 'base64').toString());
  const source = map.sourcesContent[map.sources.findIndex(name => name.endsWith('/src/utils/MoorhenCommandCentre.ts'))];
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 }
  }).outputText;
  const exports = {};
  let sequence = 0;
  runInNewContext(code, {
    exports,
    console: { log: () => {} },
    require: () => ({ v4: () => `request-${++sequence}` })
  });
  return exports.MoorhenCommandCentre;
};
const CommandCentre = installedCommandCentre();

describe('coot worker transport command batching', () => {
  let originalClone;

  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => {
    jest.useFakeTimers();
    originalClone = window.structuredClone;
    window.structuredClone = value => deserialize(serialize(value));
  });

  // eslint-disable-next-line jest/no-hooks
  afterEach(() => {
    window.structuredClone = originalClone;
    jest.useRealTimers();
  });

  const setup = () => {
    const messages = [];
    class TestWorker extends EventTarget {
      terminate() {
        return undefined;
      }
      postMessage(message, transfer) {
        messages.push({ message, transfer });
      }
    }
    const worker = new TestWorker();
    jest.spyOn(worker, 'terminate');
    jest.spyOn(worker, 'postMessage');
    const centre = Object.create(CommandCentre.prototype);
    Object.assign(centre, {
      activeMessages: [],
      cootWorker: worker,
      history: { addEntry: jest.fn(async () => {}) },
      onCommandStart: jest.fn(),
      onCommandExit: jest.fn(),
      onActiveMessagesChanged: jest.fn()
    });
    worker.onmessage = event => centre.handleMessage(event);
    const originalPost = worker.postMessage;
    const originalReceive = worker.onmessage;
    const batcher = new NativeCommandBatcher(worker);
    const send = (molNo, command = 'get_bonds_mesh_instanced', extra = {}) =>
      centre.cootCommand({
        command,
        commandArgs: [molNo, [1, 2, 3]],
        returnType: 'status',
        ...extra
      });
    const result = (item, status = 'Completed') => ({
      messageId: item.messageId,
      result: { status, result: item.commandArgs[0] }
    });
    const reply = (message, failedMolNo) =>
      worker.onmessage(
        new MessageEvent('message', {
          data:
            message.message === 'coot_command_list'
              ? {
                  messageId: message.messageId,
                  resultList: message.commandList.map(item =>
                    result(item, item.commandArgs[0] === failedMolNo ? 'Exception' : 'Completed')
                  )
                }
              : result(message)
        })
      );
    return { worker, centre, batcher, messages, send, reply, originalPost, originalReceive };
  };

  it('groups eight registered native commands into one worker message, retaining replies, activity and journaling', async () => {
    expect.hasAssertions();
    const { centre, batcher, messages, send, reply } = setup();
    const scopes = Array.from({ length: 8 }, (_, i) => batcher.register(i));
    const promises = scopes.map((scope, i) => send(i));
    expect(centre.activeMessages).toHaveLength(8);
    expect(messages).toHaveLength(1);
    expect(messages[0].message.message).toBe('coot_command_list');
    expect(messages[0].message.commandList).toHaveLength(8);
    reply(messages[0].message);
    const replies = await Promise.all(promises);
    expect(replies.map(response => response.data.result.result)).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(centre.activeMessages).toHaveLength(0);
    expect(centre.history.addEntry).toHaveBeenCalledTimes(8);
    expect(centre.onCommandStart).toHaveBeenCalledTimes(8);
    expect(centre.onCommandExit).toHaveBeenCalledTimes(8);
    scopes.forEach(scope => {
      expect(() => scope.assertHealthy()).not.toThrow();
      scope.release();
    });
    await batcher.dispose();
  });

  it('flushes before unrelated/deletion commands and sends subsequent commands from released scopes normally', async () => {
    expect.hasAssertions();
    const { batcher, centre, messages, send, reply } = setup();
    const a = batcher.register(1),
      b = batcher.register(2);
    const first = send(1),
      second = send(2),
      removal = send(3, 'close_molecule');
    expect(messages.map(entry => entry.message.message)).toStrictEqual(['coot_command_list', 'coot_command']);
    expect(messages[1].message.command).toBe('close_molecule');
    messages.forEach(entry => reply(entry.message));
    await Promise.all([first, second, removal]);
    a.release();
    b.release();
    const direct = send(1);
    expect(messages.at(-1).message.message).toBe('coot_command');
    reply(messages.at(-1).message);
    await direct;
    expect(centre.activeMessages).toHaveLength(0);
    await batcher.dispose();
  });

  it('snapshots serializable command arguments at submission and bounds each message to eight commands', async () => {
    expect.hasAssertions();
    const { batcher, messages, send, reply } = setup();
    batcher.register(1);
    const args = [1, [0.2, 0.3, 0.4]];
    const first = send(1, 'shim_set_bond_colours', { commandArgs: args });
    args[1][0] = 0.9;
    const rest = Array.from({ length: 16 }, () => send(1));
    jest.runOnlyPendingTimers();
    expect(messages).toHaveLength(3);
    expect(messages[0].message.commandList[0].commandArgs[1][0]).toBe(0.2);
    expect(messages.map(entry => entry.message.commandList?.length || 1)).toStrictEqual([8, 8, 1]);
    messages.forEach(entry => reply(entry.message));
    await Promise.all([first, ...rest]);
    await batcher.dispose();
  });

  it('reports a command exception only to its molecule scope and still resolves every native message', async () => {
    expect.hasAssertions();
    const { batcher, centre, messages, send, reply } = setup();
    const a = batcher.register(1),
      b = batcher.register(2);
    const first = send(1),
      second = send(2);
    jest.runOnlyPendingTimers();
    reply(messages[0].message, 1);
    const responses = await Promise.all([first, second]);
    expect(responses[0].data.result.status).toBe('Exception');
    expect(responses[1].data.result.status).toBe('Completed');
    expect(() => a.assertHealthy()).toThrow('Coot command failed');
    expect(() => b.assertHealthy()).not.toThrow();
    expect(centre.activeMessages).toHaveLength(0);
    await batcher.dispose();
  });

  it.each([undefined, [null]])(
    'fails incomplete batch replies without stranding native promises (%s)',
    async results => {
      expect.hasAssertions();
      const { worker, batcher, centre, messages, send } = setup();
      const a = batcher.register(1);
      batcher.register(2);
      const first = send(1),
        second = send(2);
      jest.runOnlyPendingTimers();
      worker.onmessage(
        new MessageEvent('message', { data: { messageId: messages[0].message.messageId, resultList: results } })
      );
      const replies = await Promise.all([first, second]);
      expect(replies.map(reply => reply.data.result.status)).toStrictEqual(['Exception', 'Exception']);
      expect(() => a.assertHealthy()).toThrow('Invalid Coot command batch reply');
      expect(centre.activeMessages).toHaveLength(0);
      await batcher.dispose();
    }
  );

  it('drains failed sends and worker errors, and waits for in-flight replies before restoring transport', async () => {
    expect.hasAssertions();
    const { worker, batcher, centre, messages, send, originalPost, originalReceive } = setup();
    const scope = batcher.register(1);
    batcher.register(2);
    const first = send(1),
      second = send(2);
    const disposal = batcher.dispose();
    expect(messages).toHaveLength(1);
    expect(worker.onmessage).not.toBe(originalReceive);
    worker.dispatchEvent(new Event('error'));
    await Promise.all([first, second, disposal]);
    expect(centre.activeMessages).toHaveLength(0);
    expect(() => scope.assertHealthy()).toThrow('worker failed');
    expect(worker.postMessage).toBe(originalPost);
    expect(worker.onmessage).toBe(originalReceive);
  });

  it('keeps transfer-bearing work and environments without structuredClone on the native path', async () => {
    expect.hasAssertions();
    const { worker, batcher, messages, send, reply, centre } = setup();
    batcher.register(1);
    window.structuredClone = undefined;
    const direct = send(1);
    expect(messages).toHaveLength(1);
    reply(messages[0].message);
    await direct;
    const transferable = new ArrayBuffer(4);
    worker.postMessage({ message: 'other', bytes: transferable }, [transferable]);
    expect(messages.at(-1).transfer).toStrictEqual([transferable]);
    expect(centre.activeMessages).toHaveLength(0);
    await batcher.dispose();
  });

  it('preserves send failures and drains other replies even when an activity notification throws', async () => {
    expect.hasAssertions();
    const { batcher, centre, originalPost, messages, send, reply } = setup();
    const scope = batcher.register(1);
    batcher.register(2);
    const failure = new Error('postMessage failed');
    originalPost.mockImplementationOnce(() => {
      throw failure;
    });
    const first = send(1),
      second = send(2);
    jest.runOnlyPendingTimers();
    await Promise.all([first, second]);
    let caught;
    try {
      scope.assertHealthy();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
    expect(centre.activeMessages).toHaveLength(0);
    const third = send(1),
      fourth = send(2);
    jest.runOnlyPendingTimers();
    const notificationError = new Error('activity callback failed');
    centre.onActiveMessagesChanged.mockImplementationOnce(() => {
      throw notificationError;
    });
    expect(() => reply(messages.at(-1).message)).toThrow(notificationError);
    await Promise.all([third, fourth]);
    expect(centre.activeMessages).toHaveLength(0);
    await batcher.dispose();
  });

  it('settles queued native work when the worker is terminated', async () => {
    expect.hasAssertions();
    const { worker, batcher, centre, send } = setup();
    batcher.register(1);
    batcher.register(2);
    const first = send(1),
      second = send(2);
    worker.terminate();
    await Promise.all([first, second]);
    expect(centre.activeMessages).toHaveLength(0);
    await batcher.dispose();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('keeps one shared-worker wrapper across overlapping adapter leases and asynchronous cleanup', async () => {
    expect.hasAssertions();
    const { worker, batcher, originalPost, originalReceive, messages, send, reply } = setup();
    await batcher.dispose();
    const firstOwner = acquireNativeCommandBatcher(worker);
    const firstScope = firstOwner.register(1);
    const a = send(1),
      b = send(1);
    firstScope.release();
    const disposing = firstOwner.dispose();
    const secondOwner = acquireNativeCommandBatcher(worker);
    const secondScope = secondOwner.register(2);
    reply(messages[0].message);
    await Promise.all([a, b, disposing]);
    expect(worker.postMessage).not.toBe(originalPost);
    const c = send(2),
      d = send(2);
    jest.runOnlyPendingTimers();
    expect(messages.at(-1).message.commandList).toHaveLength(2);
    reply(messages.at(-1).message);
    await Promise.all([c, d]);
    secondScope.release();
    await secondOwner.dispose();
    expect(worker.postMessage).toBe(originalPost);
    expect(worker.onmessage).toBe(originalReceive);
  });
});
