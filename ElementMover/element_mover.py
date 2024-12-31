#!/usr/bin/env python

import sys
import json
import struct
import logging
import win32api
import win32con
import time
from ctypes import windll

# Set up logging
logging.basicConfig(filename='element_mover.log', level=logging.DEBUG)


def get_message():
    """Read a message from stdin and decode it."""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    message_length = struct.unpack('=I', raw_length)[0]
    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)


def send_message(message):
    """Encode and send a message to stdout."""
    encoded_content = json.dumps(message).encode('utf-8')
    encoded_length = struct.pack('=I', len(encoded_content))
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.buffer.flush()


def perform_mouse_action(start_x, start_y, target_x, target_y):
    """Perform the drag and drop using direct mouse control."""
    try:
        # Convert coordinates to integer
        start_x, start_y = int(start_x), int(start_y)
        target_x, target_y = int(target_x), int(target_y)

        # Move to start position
        win32api.SetCursorPos((start_x, start_y))
        time.sleep(0.1)  # Small delay for stability

        # Press mouse down
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN,
                             start_x, start_y, 0, 0)
        time.sleep(0.1)  # Hold for a moment

        # Move to target position (smooth movement)
        steps = 10
        for i in range(steps + 1):
            current_x = start_x + ((target_x - start_x) * i // steps)
            current_y = start_y + ((target_y - start_y) * i // steps)
            win32api.SetCursorPos((current_x, current_y))
            time.sleep(0.02)  # Small delay between movements

        # Release mouse at target position
        win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP,
                             target_x, target_y, 0, 0)

        return {"success": True}

    except Exception as e:
        logging.error(f"Error during mouse action: {str(e)}")
        return {"success": False, "error": str(e)}


def main():
    """Main program loop."""
    try:
        while True:
            message = get_message()
            if message is None:
                break

            logging.debug(f"Received message: {message}")

            if message.get('action') == 'move':
                result = perform_mouse_action(
                    message['startX'],
                    message['startY'],
                    message['targetX'],
                    message['targetY']
                )
                send_message(result)
            else:
                send_message({"success": False, "error": "Invalid action"})

    except Exception as e:
        logging.error(f"Fatal error: {str(e)}")
        sys.exit(1)


if __name__ == '__main__':
    main()
