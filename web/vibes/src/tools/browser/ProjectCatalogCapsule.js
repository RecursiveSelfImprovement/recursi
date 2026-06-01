class ProjectCatalogCapsule {
  static _data_catalog() {
      return {
        "Starter Templates": this.getStarterTemplates(),
        "Games & Interactive": this.getGamesAndInteractive(),
        "Tools & Apps": this.getToolsAndApps(),
        "Experiments": this.getExperiments(),
        "meta": this.getMeta(),
        "Shared Library Files": this.getSharedLibraryFiles()
      };
    }

  static getCatalog() {
    return this._data_catalog();
  }

  static getCategories() {
    return Object.keys(this._data_catalog());
  }

  static getProjectsInCategory(categoryName) {
    const catalog = this._data_catalog();
    const projects = catalog[String(categoryName || "")];
    return Array.from(projects).slice();
  }

  static findProject(projectName) {
    const wanted = String(projectName || "").trim().toLowerCase();
    if (!wanted) return null;

    const catalog = this._data_catalog();
    for (const categoryName of Object.keys(catalog)) {
      const projects = Array.isArray(catalog[categoryName]) ? catalog[categoryName] : [];
      for (const project of projects) {
        if (String(project?.name || "").toLowerCase() === wanted) {
          return {
            categoryName,
            project: { ...project }
          };
        }
      }
    }

    return null;
  }

  static listProjectNames() {
    const names = [];
    const catalog = this._data_catalog();

    for (const categoryName of Object.keys(catalog)) {
      const projects = Array.isArray(catalog[categoryName]) ? catalog[categoryName] : [];
      for (const project of projects) {
        if (project?.name) names.push(project.name);
      }
    }

    return names;
  }

  static getStarterTemplates() {
      return [
        {
          "name": "BasicsWithDialogBox",
          "entryFile": "/BasicsWithDialogBox/js/BasicsWithDialogBox.js",
          "description": "A bare-bones project demonstrating makeElement, applyCss, and DialogBox. The ideal starting point for any new app.",
          "thumbnails": [
            "/projectBrowserThumbnails/BasicsWithDialogBox-1.jpg"
          ]
        },
        {
          "name": "Basic3d",
          "entryFile": "/Basic3d/src/Basic3d.js",
          "description": "A minimal Three.js template with scene, camera, render loop, and a beautiful environment map. The starting point for 3D apps and games.",
          "thumbnails": [
            "/projectBrowserThumbnails/Basic3d-1.jpg",
            "/projectBrowserThumbnails/Basic3d-2.jpg"
          ]
        },
        {
          "name": "CodeEditor",
          "description": "A code editor in a resizable dialog box, built with the CodeMirror 6 library.",
          "thumbnails": [
            "/projectBrowserThumbnails/CodeEditor-1.jpg"
          ]
        }
      ];
    }

  static getGamesAndInteractive() {
      return [
        {
          "name": "AardvarkPlaylist",
          "description": "Our Flagship amazing application - a wildly sophisticated YouTube video player application -- both browser extension and associated web page -- with a 3d 'Guitar Hero for piano' thing built in. My main showcase app. (oh and by the way: YouTube without ads while staying within user terms.... as a by product)",
          "thumbnails": [
            "/projectBrowserThumbnails/Aardvark-1.jpg"
          ]
        },
        {
          "name": "legos",
          "description": "A 'find the difference' game using 3D Lego models rotating in space. Spot the single different brick between two 3d structures seen from different directions. Great for spacial reasoning practice.  Cool explody effects, because we can.",
          "thumbnails": [
            "/projectBrowserThumbnails/legos-1.jpg",
            "/projectBrowserThumbnails/legos-2.jpg",
            "/projectBrowserThumbnails/legos-3.jpg"
          ]
        },
        {
          "name": "MathStorm",
          "description": "A fast-paced arithmetic game - solve as many arithmetic problems as you can. Great for kids practicing their basic math skills.",
          "thumbnails": [
            "/projectBrowserThumbnails/MathStorm-1.jpg"
          ]
        },
        {
          "name": "guessTheNoteGame",
          "description": "A music ear-training game that lets you practice interval recognition, which will help with playing songs \"by ear.\" Works great on small devices. Surprisingly fun while truly building music skills.",
          "thumbnails": [
            "/projectBrowserThumbnails/guessTheNoteGame-1.jpg",
            "/projectBrowserThumbnails/guessTheNoteGame-2.jpg"
          ]
        },
        {
          "name": "AlphabetGame",
          "description": "A sliding puzzle game. It's fun for kids, but adults will love the 'Dark Theme' which plunges the puzzle into a delightfully macabre, goth-style joke. Quite cool.",
          "thumbnails": [
            "/projectBrowserThumbnails/AlphabetGame-1.jpg",
            "/projectBrowserThumbnails/AlphabetGame-2.jpg"
          ]
        }
      ];
    }

  static getToolsAndApps() {
      return [
        {
          "name": "accuCad",
          "description": "A sophisticated 3D CAD engine featuring an AccuDraw-style drawing tool-a design concept invented by Yours Truly over 30 years ago and still used everyday by engineers around the world.",
          "thumbnails": [
            "/projectBrowserThumbnails/accuCad-1.jpg",
            "/projectBrowserThumbnails/accuCad-2.jpg"
          ]
        },
        {
          "name": "Calculator",
          "description": "A calculator that handles repeating decimals, fractions, and smart parentheses.",
          "thumbnails": [
            "/projectBrowserThumbnails/Calculator-1.jpg"
          ]
        },
        {
          "name": "Comments",
          "description": "A comments system that runs both with a real server and a mock client-side server."
        },
        {
          "name": "Scratchy",
          "description": "A vibe coding helper for Scratch - drag in any .sb3 file, build AI prompts with full project context, and evolve your code with surgical patches. Built by our eponymous intern, who is... a dog (?) Great for kids, and getting them familiar with using AI to be more creative.",
          "thumbnails": [
            "/projectBrowserThumbnails/Scratchy-1.jpg",
            "/projectBrowserThumbnails/Scratchy-2.jpg"
          ]
        },
        {
          "name": "MarkdownNotebook",
          "description": "A markdown notebook app for writing and organizing notes with a clean, focused interface.",
          "thumbnails": [
            "/projectBrowserThumbnails/MarkdownNotebook-1.jpg",
            "/projectBrowserThumbnails/MarkdownNotebook-2.jpg",
            "/projectBrowserThumbnails/MarkdownNotebook-3.jpg"
          ]
        },
        {
          "name": "DrawingApp",
          "description": "A drawing application using SVG curves, with an experimental curve drawing tool, and cool color picker, MIDI controller support, and probably other stuff I can't even remember.",
          "thumbnails": [
            "/projectBrowserThumbnails/DrawingApp-1.jpg",
            "/projectBrowserThumbnails/DrawingApp-2.jpg"
          ]
        },
        {
          "name": "AlphaChannelMagic",
          "description": "A powerful color-to-alpha image processor - swap colors in images (say, change a red object to a green, white or black object realistically) and more. \"Alpha\" refers to transparency, by the way."
        },
        {
          "name": "MidiScraper",
          "entryFile": "/MidiScraper/js/MidiScraper.js",
          "description": "Scrapes piano tutorial animations from YouTube videos into high-fidelity 3D piano rolls for the Aardvark player."
        },
        {
          "name": "Backend",
          "entryFile": "/Backend/browser/Backend.js",
          "description": "Unified command console, local disk scanner, remote code execution engine, and main site deploy console on Port 8000.",
          "thumbnails": [
            "/projectBrowserThumbnails/BasicsWithDialogBox-1.jpg"
          ],
          "disableStaticOpen": true 
        }
      ];
    }

  static getExperiments() {
      return [
        {
          "name": "Penrose",
          "description": "Penrose tiling rendered with SVGs - aperiodic tessellation patterns. Just a quick experiment",
          "thumbnails": [
            "/projectBrowserThumbnails/Penrose-1.jpg"
          ]
        },
        {
          "name": "squircle",
          "description": "An interactive tool for making squircles - the shape between a square and a circle.  Experiment for use in the AccuCad tool, where the \"floating origin\" gizmo needed to transition between square and circle and do so beautifully.",
          "thumbnails": [
            "/projectBrowserThumbnails/squircle-1.jpg",
            "/projectBrowserThumbnails/squircle-2.jpg"
          ]
        },
        {
          "name": "teacup",
          "description": "A 3D teacup geometry demonstration. You've got to admit, that spinning animation is pretty neat, right?",
          "thumbnails": [
            "/projectBrowserThumbnails/teacup-1.jpg",
            "/projectBrowserThumbnails/teacup-2.jpg",
            "/projectBrowserThumbnails/teacup-3.jpg"
          ]
        },
        {
          "name": "ScrewThread",
          "description": "3D screw thread geometry - another quick experiment, this time in helical surface modeling."
        },
        {
          "name": "BlueGreen",
          "description": "A simple, one-off visual app designed specifically to generate a beautifully jittered gradient image."
        }
      ];
    }

  

  static getSharedLibraryFiles() {
      return [
        {
          "name": "recursi.js",
          "description": "Core global utilities natively made available by DomBasics (Who needs React bloat?)"
        },
        {
          "name": "DropdownMenu.js",
          "description": "Context and dropdown menus attached to target elements, with separators and custom actions."
        },
        {
          "name": "CompactMenu.js",
          "description": "A compact, icon-driven menu component. To be documented."
        },
        {
          "name": "RadialMenu.js",
          "description": "A circular radial menu that fans out from a click point. To be documented."
        },
        {
          "name": "PopupBox.js",
          "description": "A lightweight popup container - simpler than DialogBox for quick tooltips and overlays. To be documented."
        },
        {
          "name": "GlowBox.js",
          "description": "A UI highlighter that creates an animated, glowing border to draw attention to specific elements."
        },
        {
          "name": "GlowingTooltip.js",
          "description": "Tooltips with a subtle glow effect and smart positioning. To be documented."
        },
        {
          "name": "SimplePanel.js",
          "description": "A panel container with header, content area, and optional resize/collapse behavior. To be documented."
        },
        {
          "name": "SliderControl.js",
          "description": "A customizable slider input component with labels, ranges, and value display. To be documented."
        },
        {
          "name": "SpinnerWidget.js",
          "description": "A numeric spinner input with increment/decrement buttons and configurable step sizes. To be documented."
        },
        {
          "name": "SplitButton.js",
          "description": "A button with a dropdown arrow for secondary actions. To be documented."
        },
        {
          "name": "SmartElementPositioner.js",
          "description": "Utility for positioning popups and menus near their trigger elements without overflowing the viewport. To be documented."
        },
        {
          "name": "DictationWidget.js",
          "description": "Voice-to-text input widget using the Web Speech API. Provides a full dictation UI with start/stop, live transcription, and corrections."
        },
        {
          "name": "KeyCommandHandler.js",
          "description": "Keyboard shortcut manager - register key combos and dispatch actions. To be documented."
        },
        {
          "name": "KeystrokeHandler.js",
          "description": "Low-level keystroke capture and routing. To be documented."
        },
        {
          "name": "MidiInputHandler.js",
          "description": "Web MIDI API wrapper for receiving MIDI input from connected devices. To be documented."
        },
        {
          "name": "SvgAnimationFun.js",
          "description": "SVG animation utilities and effects library. To be documented."
        },
        {
          "name": "GeometryUtils3d.js",
          "description": "3D geometry math utilities - vectors, matrices, and shape helpers for Three.js projects. To be documented."
        },
        {
          "name": "ColorUtils.js",
          "description": "Color conversion and manipulation utilities. To be documented."
        },
        {
          "name": "VideoPlayer.js",
          "description": "A video player component with playback controls and YouTube integration. To be documented."
        },
        {
          "name": "VideoShowcase.js",
          "description": "A video gallery/showcase component for displaying multiple videos. To be documented."
        },
        {
          "name": "GlowPiano.js",
          "description": "An interactive piano keyboard component with glow effects and MIDI support. To be documented."
        },
        {
          "name": "GraphicPiano.js",
          "description": "A visual piano keyboard renderer. To be documented."
        },
        {
          "name": "WindowMessenger.js",
          "description": "Cross-window postMessage communication with protocol versioning and handshaking."
        },
        {
          "name": "CrossWindowMessenger.js",
          "description": "An alternative cross-window messenger implementation. To be documented."
        },
        {
          "name": "UuidUtils.js",
          "description": "UUID generation utility - a single function for generating unique identifiers."
        }
      ];
    }

  static getMeta() {
      return [
        {
          "name": "vibes",
          "description": "The master controls of Recursi itself-a browser-based vibe coding environment to build, edit, and recursively improve other apps.",
          "selfEditor": true
        },
        {
          "name": "frontPage",
          "entryFile": "/frontPage/FrontPage.js",
          "description": "The main landing page and blog site for recursi.dev."
        },
        {
          "name": "Protocol Playground",
          "entryFile": "/ProtocolTests/RecursiTestRunner.js",
          "description": "The official harness and validation playground for testing Vibes Protocol, parser heuristics, and code-formatting pipelines."
        },
        {
          "name": "Conversation Timeline (Experimental)",
          "entryFile": "/ConversationView/js/SeedAgent.js",
          "description": "An experimental, barely-started timeline interface for chatting and executing tasks. Highly unstable, enter at your own risk!"
        }
      ];
    }
}