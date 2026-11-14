import unittest
from merchant_demo import is_reset_message, reset_code_from_message


class MerchantDemoTest(unittest.TestCase):
    def message(self, text='Your password reset code is:\n\n123456\n'):
        return {'Subject': 'Reset your SwiftDrop password', 'To': [{'Address': 'merchant@example.test'}], 'Text': text}

    def test_selects_the_intended_recipient_and_reset_subject(self):
        self.assertTrue(is_reset_message(self.message(), 'MERCHANT@example.test'))
        self.assertFalse(is_reset_message(self.message(), 'other@example.test'))
        self.assertFalse(is_reset_message(dict(self.message(), Subject='Parcel update'), 'merchant@example.test'))

    def test_extracts_the_six_digit_code_without_following_a_link(self):
        self.assertEqual(reset_code_from_message(self.message(), 'merchant@example.test'), '123456')

    def test_rejects_another_merchants_message_without_exposing_its_secret(self):
        with self.assertRaises(ValueError) as failure:
            reset_code_from_message(self.message(), 'other@example.test')
        self.assertNotIn('123456', str(failure.exception))
        self.assertNotIn('merchant@example.test', str(failure.exception))

    def test_rejects_messages_without_a_six_digit_code(self):
        for body in ['https://external.example/reset-password?token=secret',
                     'No reset code was included.',
                     '12345']:
            with self.subTest(body=body), self.assertRaises(ValueError):
                reset_code_from_message(self.message(body), 'merchant@example.test')


if __name__ == '__main__':
    unittest.main()
