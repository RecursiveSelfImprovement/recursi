// phase2-managed-migration: internal imports/exports stripped
class PromptInjector {
  
  constructor() {
      this.tips = [
        'CRITICAL: When generating code blocks, use ```javascript or ```css language tags.',
        "PROTOCOL: Do not abbreviate code (e.g., '// ... rest of code'). Send full methods.",
        "TIP: Put complexity in methods that start with an underbar and are considered private. These are compact-hidden in the UI to save tokens.",
        "FORMAT: Your response is parsed programmatically. Stick strictly to the V3 run(env) and env.saveClass protocol.",
        'REMINDER: JavaScript files must only contain pure classes; do not use require or top-level variable assignments outside of the class block.',
      ];
      this.errorContext = [];
    }

  addErrorContext(msg) {
      this.errorContext.push(msg);
      if (this.errorContext.length > 3) this.errorContext.shift();
    }

  clearErrors() {
      this.errorContext = [];
    }

  inject(originalPrompt) {
      const randomTip = this.tips[Math.floor(Math.random() * this.tips.length)];

      let injection = `\n\n
---
### 🔴 VIBES SYSTEM META-CONTEXT
*System instructions - Do not reply to this section. Use this context to format your response correctly.*

1. **Protocol Constraint:** ${randomTip}
2. **V3 JAVASCRIPT MUTATION BEHAVIOR:**
   - All JavaScript logic must execute within a single entry point:
     \`\`\`javascript
     async function run(env) {
       await env.saveClass({ type: 'modify', name: 'ClassName', path: 'path/to/file.js' }, class ClassName {
         // method modifications here
       });
     }
     \`\`\`
   - For non-JS assets (CSS, HTML, JSON), write direct file writes using \`env.writeFile(path, content)\` inside \`run(env)\`.
`;

      if (this.errorContext.length > 0) {
        injection += `\n3. **Recent System Errors:**\n`;
        this.errorContext.forEach((err) => {
          injection += `   - ${err}\n`;
        });
        this.errorContext = [];
      }

      injection += `---\n`;

      return originalPrompt + injection;
    }

      


  static _doc() {
      return [
        this._doc_overview(),
        this._doc_behavior()
      ].join('\n\n');
    }

  static _doc_overview() {
      return "### PromptInjector\n\nAppends system instructions and contextual hints (tips) to user prompts before sending them to the language model. This enforces protocol compliance and dynamically feeds back recent system errors to enable self-correction.";
    }

  static _doc_behavior() {
      return "### Behavior\n\n- **Tips Rotation**: Picks a random tip from a curated set to keep the LLM focused on specific rules (e.g. no code abbreviation).\n- **Error Feedback**: Captures and appends recent parser/execution errors so the AI can correct its output in the subsequent turn.";
    }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 116,
  "provides": [
    "PromptInjector"
  ],
  "deps": []
}
recursi-meta */
