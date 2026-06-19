# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x | ✅ |

## Reporting a Vulnerability

The html-native-engine project takes security seriously. If you discover a security vulnerability, please **do not** open a public GitHub issue.

Instead, report it privately by emailing the project maintainers or opening a draft security advisory on GitHub.

### What to Include

- Type of vulnerability
- Steps to reproduce
- Affected versions
- Potential impact
- Suggested fix (if any)

### Response Time

You can expect an acknowledgment within 48 hours, and a detailed response within 5 business days regarding the next steps.

## Security Considerations

### Local-First Architecture

html-native-engine is a local-first compiler. It does not:
- Send any data to remote servers (except optional local Ollama API)
- Require network access to function
- Store or cache user HTML/CSS content persistently
- Execute arbitrary code from input files

### AI Enhancement

When using `--ai-enhance`:
- The AI model (Ollama) runs **locally on your machine**
- HTML/CSS content never leaves your computer
- The Ollama API endpoint defaults to `http://localhost:11434`
- No data is sent to external AI providers

### Dependency Security

Dependencies are declared per-package following npm workspace best practices. The lockfile (`package-lock.json`) is maintained to ensure reproducible installs.

## Best Practices

1. Always use the latest version of the compiler
2. Review generated code before deploying to production
3. Validate input HTML/CSS from untrusted sources before compilation
4. Run `npm audit` regularly on your project
