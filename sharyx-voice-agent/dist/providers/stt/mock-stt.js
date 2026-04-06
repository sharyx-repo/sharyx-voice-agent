"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSTT = void 0;
const events_1 = require("events");
class MockSttConnection extends events_1.EventEmitter {
    send(audio) {
        // Mock: Ignore audio, but could emit 'speech_started'
    }
    finish() {
        this.emit('close');
    }
    getReadyState() {
        return 1; // Open
    }
}
/**
 * A mock STT provider for offline testing.
 */
class MockSTT {
    createLiveConnection(options) {
        return new MockSttConnection();
    }
}
exports.MockSTT = MockSTT;
