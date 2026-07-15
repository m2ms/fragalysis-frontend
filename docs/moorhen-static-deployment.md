# Moorhen Static Asset Deployment

Stage 15 installs Moorhen without enabling it as a viewer. NGL remains the only runtime viewer, but Moorhen's worker,
WASM, monomer, and supporting assets are prepared for the proof route in Stage 16.

## Generated Assets

`yarn copy:moorhen-assets` replaces `bundles/moorhen` with the complete contents of
`node_modules/moorhen/public` and verifies every relative path, byte count, and SHA-256 digest. The output is
generated and remains ignored through the existing `bundles/` rule.

The local asset base URL is `/bundles/moorhen`. Production must publish `bundles/moorhen` below the same static
root used for the Webpack bundle. A deployment that prefixes frontend static files should preserve the directory
and configure the future Moorhen wrapper with that prefixed base URL.

The normal `start`, `build`, `watch`, and `dev` scripts run the copy step. GitHub Actions, Jenkins, and the Docker
build additionally run `yarn verify:moorhen-assets` after the production build.

## Required Response Headers

The top-level Fragalysis HTML response must include both headers below. Adding them only to WASM or JavaScript
responses does not make the page cross-origin isolated.

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Frontend static responses should also include this header, especially when the development bundle is served from
port 3030 while Django runs on another origin:

```text
Cross-Origin-Resource-Policy: cross-origin
```

The local Express server sets all three headers and serves `.wasm` as `application/wasm`. The Django development
response and the production proxy must mirror the two isolation headers on the document response.

For Django, use response middleware at the outer application boundary so error responses are covered too:

```python
class CrossOriginIsolationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["Cross-Origin-Opener-Policy"] = "same-origin"
        response["Cross-Origin-Embedder-Policy"] = "require-corp"
        return response
```

For nginx or an ingress controller, apply the equivalent headers with `always` semantics at the server or ingress
response level. Ensure the active MIME types table contains:

```nginx
application/wasm  wasm;
```

Map the generated directory from the frontend build image, for example from `/frontend/bundles/moorhen`, into the
deployed static URL. Do not serve `node_modules` directly.

Ingress installations differ in whether response-header snippets are permitted. Configure the two isolation
headers through the platform's supported response-header policy and verify them after deployment rather than
assuming an annotation was accepted.

## External Resources

`Cross-Origin-Embedder-Policy: require-corp` blocks cross-origin subresources unless they opt in through CORS or a
compatible Cross-Origin-Resource-Policy. The RDKit script request now uses anonymous CORS. Backend API/media hosts,
fonts, images, scripts, and future worker URLs must remain same-origin or return suitable CORS/CORP headers.
Top-level links and downloads opened as navigations are not embedded resources and do not need CORP.

## Deployment Check

After deploying, verify representative responses:

```text
GET <static-root>/bundles/moorhen/CootWorker.js
GET <static-root>/bundles/moorhen/moorhen.wasm
GET <static-root>/bundles/moorhen/baby-gru/monomers/a/ALA.cif
```

All three must return HTTP 200. The WASM response must use `Content-Type: application/wasm`, and the browser console
must show `window.crossOriginIsolated === true` on the Fragalysis page before Stage 16 initializes Moorhen.
