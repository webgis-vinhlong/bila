# Security policy

## Supported version

Security fixes currently target the latest `5.0.0-devkit-preview` source on the default branch.

## Reporting

Please use GitHub's private vulnerability reporting feature when it is available for this repository. Do not include exploit details in a public issue before a fix is ready.

The browser playground executes user-entered code in a short-lived Web Worker and terminates it after a time limit. This reduces UI lockups, but the playground is still a developer tool: only run code you understand. The compiler and CLI do not provide a security sandbox for untrusted programs.
