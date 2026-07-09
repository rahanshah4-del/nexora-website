# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Communication
- Communicate in Roman Urdu (Urdu written in Latin/Roman script) when speaking with the user. Confidence: 0.70

# Performance Workflow
- Before optimizing performance, first produce a complete audit report with file names, sizes, load times, suggested fixes, and estimated PageSpeed gains — do not modify code until the report is approved. Confidence: 0.75

# Build Workflow
- Run `npm run build` after making code changes to verify the build passes before reporting completion. Confidence: 0.72
- Do not commit or push code changes unless explicitly asked to do so. Confidence: 0.75

# Task Response Format
- When the user provides a structured task with IDE context, Goal, numbered Safe fixes / Do NOT lists, Run, and Report sections, follow the exact structure: audit callers, make surgical changes only within allowed files, verify backward compatibility, run build, and produce a detailed report matching the requested sections. Confidence: 0.77

# File Access
- Before opening additional files beyond those initially specified, stop and ask for permission. Do not search the entire repository — limit file access to explicitly listed files. Confidence: 0.78

