"""Read only the intended merchant's reset message in disposable demo Mailpit."""
import re


def is_reset_message(message, email):
    return (message.get('Subject') == 'Reset your SwiftDrop password'
            and any(recipient.get('Address', '').lower() == email.lower()
                    for recipient in message.get('To', [])))


def reset_code_from_message(message, email):
    if is_reset_message(message, email):
        match = re.search(r'(?m)^\s*(\d{6})\s*$', message.get('Text', ''))
        if match:
            return match.group(1)
    # Never include a message body, reset URL or token in a failure report.
    raise ValueError('Expected merchant reset message with one six-digit code')
