# Development

This is only relevant for Stoplight engineers.

### Setup

##### Dependencies

* Stoplight Platform
* Node >= 7

##### OS X / Linux

Install the dev deps listed above.

```bash
yarn install && cd app && yarn install && cd ..
yarn start
```

##### Building

Builds will be located in the /dist folder.

```bash
yarn build:production
```

##### Code Signing

This is useful: https://mkaz.tech/code-signing-a-windows-application.html.

CSC_LINK, WIN_CSC_LINK, and CSC_KEY_PASSWORD must be set in your environment. For example:

Our mac cert is provided by apple developer program. Install it into your keychain, export it to .p12 from the keychain/login screen.

Our windows cert is provided by Digicert. Install it into your keychain, export it to .p12 from the keychain/login screen.

```bash
export CSC_LINK="~/Documents/Credentials/evario-cert/cert-mac.p12"
export WIN_CSC_LINK="~/Documents/Credentials/evario-cert/cert.p12"
export CSC_KEY_PASSWORD="123"
```

##### Releasing

GH_TOKEN needs to be set in your environment.

Code signing needs to be setup.

1. Increment app/package.json version property.
2. Build Stoplight Platform, replace app/build with newly built public files (just files/folders in the public directory).

```bash
yarn release:production
```

### Project Structure

Notable directories and files:

##### app/main.js

The entry point to the application. This is run when it starts. This file opens a new Electron window, loading either a local instance of the API Dashboard (in development), or a remote instance of the dashboard.

##### app/utils/browser/index.js

This is a pre-script, run before the remote dashboard is loaded. Here, we set a global Electron variable, making several native node modules available to the Stoplight platform.
