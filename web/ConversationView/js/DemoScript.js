class DemoScript {
    static getBeats() {
      return [
        { type: 'sys', delay: 400, text: 'workspace: ProjectAlpha | runner active' },
        { type: 'user', name: 'Rob', text: 'Hey ChatGPT, I need a quick greeting function in Python. Keep it simple.', method: 'paste', delay: 400 },
        { 
          type: 'seed', name: 'ChatGPT', id: 'msg-1', 
          text: "Here is a simple greeting function in Python:\\n\\n\`\`\`python\\ndef greet(name):\\n    print(f'Hello, {name}!')\\n\\ngreet('World')\\n\`\`\`\\n\\nThis function takes a name as an argument and prints a formatted greeting to the console.", 
          delay: 600, thinkMs: 1000 
        },
        { type: 'sys', delay: 400, text: "Rating ChatGPT's response..." },
        { type: 'cursor-move', target: 'msg-slider-msg-1-text-length', delay: 600 },
        { type: 'msg-slide', msgId: 'msg-1', sliderId: 'text-length', to: 30, delay: 200 }, 
        { type: 'cursor-move', target: 'msg-slider-msg-1-ans-qual', delay: 300 },
        { type: 'msg-slide', msgId: 'msg-1', sliderId: 'ans-qual', to: 80, delay: 200 }, 
        { type: 'cursor-move', target: 'handoff-msg-1-Gemini', delay: 500 },
        { type: 'cursor-click' },
        { type: 'action', action: 'handoff', msgId: 'msg-1', agent: 'Gemini', delay: 200 },
        { type: 'sys', delay: 400, text: "Handoff triggered. Waiting for Gemini..." },
        { type: 'cursor-move', target: 'diff-btn-msg-2', delay: 800 },
        { type: 'cursor-click' },
        { type: 'action', action: 'diff-expand', msgId: 'msg-2', delay: 400 },
        { type: 'cursor-move', target: 'msg-slider-msg-2-code-qual', delay: 800 },
        { type: 'msg-slide', msgId: 'msg-2', sliderId: 'code-qual', to: 100, delay: 200 }, 
        { type: 'cursor-move', target: 'handoff-msg-2-Claude', delay: 500 },
        { type: 'cursor-click' },
        { type: 'action', action: 'handoff', msgId: 'msg-2', agent: 'Claude', delay: 200 },
        { type: 'sys', delay: 400, text: "Claude analyzing..." },
        { 
          type: 'seed', name: 'Claude', id: 'msg-3', 
          text: "The \`&str\` is a whisper of a promise, borrowing a slice of memory without claiming its soul. When \`println!\` invokes its magic, it weaves the borrowed text into the standard output stream, a fleeting shadow cast upon the terminal's glowing void before control returns, spotless and unchanged.", 
          delay: 600, thinkMs: 2500 
        },
        { type: 'sys', delay: 400, text: "Rating Claude's response..." },
        { type: 'cursor-move', target: 'msg-slider-msg-3-style', delay: 500 },
        { type: 'msg-slide', msgId: 'msg-3', sliderId: 'style', to: 95, delay: 200 },
        { type: 'sys', delay: 800, text: 'Adjusting permanent workspace preferences...' },
        { type: 'cursor-move', target: 'sp-input-trust', delay: 600 },
        { type: 'cursor-click' },
        { type: 'slide', id: 'trust', to: 100, delay: 100 },
        { type: 'sys', delay: 800, text: 'Reviewing implementation...' },
        { 
          type: 'review-show', 
          title: '/MyProject/src/utils.rs (replace)', 
          code: `pub fn fast_inverse_sqrt(x: f32) -> f32 {\\n    let i = x.to_bits();\\n    let i = 0x5f3759df - (i >> 1);\\n    let y = f32::from_bits(i);\\n    y * (1.5 - 0.5 * x * y * y)\\n}`, 
          delay: 1000 
        },
        { type: 'cursor-move', target: 'rv-expand', delay: 800 },
        { type: 'cursor-click' },
        { type: 'review-expand', delay: 100 },
        { type: 'cursor-scroll', target: 'sa-review-box', amount: 50, delay: 600 },
        { type: 'cursor-move', target: 'rv-accept', delay: 1200 },
        { type: 'cursor-click' },
        { type: 'review-accept', delay: 100 }
      ];
    }

}