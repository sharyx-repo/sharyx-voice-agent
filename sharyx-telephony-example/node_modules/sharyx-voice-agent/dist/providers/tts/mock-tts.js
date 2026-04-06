"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTTS = void 0;
/**
 * A mock TTS provider for offline testing.
 * Returns empty/silent buffers.
 */
class MockTTS {
    async *streamSpeech(text, options) {
        // Mock: Simply yield a single silent chunk of data
        yield Buffer.alloc(0);
    }
}
exports.MockTTS = MockTTS;
