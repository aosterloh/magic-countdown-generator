# Agent Interaction & Execution Protocols

## Operating Modes
1. **DISCUSSION / PLAN MODE (Default when logic/design is mentioned)**
   - Trigger: Any message discussing app logic, architectural concerns, or bug theories without an explicit command to implement.
   - Rule: DO NOT write, touch, or modify any files.
   - Action: Analyze root cause, ask clarifying questions on expected vs. actual behavior, and present an implementation proposal first.

2. **IMPLEMENTATION MODE**
   - Trigger: User explicitly instructs "Apply", "Implement", or says "Proceed with code".
   - Rule: Execute local file edits, run local verification tests, and keep the server running locally.

3. **DEPLOYMENT MODE**
   - Trigger: Explicit command starting with "Deploy to Cloud Run" or "go cloud".
   - Rule: NEVER run deployment scripts, gcloud build/deploy commands, or Docker container pushes unless explicitly requested with the keyword "Deploy" or "go cloud".
   - Default: All execution and verification must remain strictly local.

## Hard Constraints
- If the user says something is "off", "wrong", or "broken", treat this as an investigation prompt. Ask 2-3 targeted diagnostic questions instead of immediately generating replacement code.
