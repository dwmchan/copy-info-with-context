# Django Settings with Sensitive Data

DEBUG = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'company_db',
        'USER': 'dbadmin',
        'PASSWORD': 'db_password_789',
        'HOST': '192.168.1.50',
        'PORT': '5432',
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'company.notifications@gmail.com'
EMAIL_HOST_PASSWORD = 'gmail_app_password_123'

ADMINS = [
    ('John Anderson', 'john.anderson@company.com'),
    ('Sarah Mitchell', 'sarah.mitchell@company.com'),
]

# API Configuration
STRIPE_PUBLIC_KEY = 'pk_live_51HxYzABCDEFGH987654321'
STRIPE_SECRET_KEY = 'sk_live_51HxYzABCDEFGH123456789'

SENDGRID_API_KEY = 'SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ123456.AbCdEfGhIjKlMnOpQrStUvWxYz123456789'

# Australian Tax Settings
COMPANY_ABN = '12 345 678 901'
COMPANY_TFN = '123 456 789'

# Test User Accounts
TEST_USERS = [
    {
        'email': 'testuser1@example.com',
        'phone': '+61 412 345 678',
        'customer_id': 'CUST-00012345',
        'medicare': '2234 56789 1'
    },
    {
        'email': 'testuser2@example.com',
        'phone': '0423 456 789',
        'customer_id': 'CUST-00067890',
        'medicare': '3345 67890 2'
    }
]

# Payment Gateway
PAYMENT_CONFIG = {
    'bsb': '123-456',
    'account_number': '987654321',
    'merchant_id': 'MERCH-123456',
    'test_cards': {
        'visa': '4532 1234 5678 9010',
        'mastercard': '5425 2334 3010 9903',
        'amex': '3714 4963 5398 431'
    }
}

# Support Contact
SUPPORT_EMAIL = 'support@company.com'
SUPPORT_PHONE = '+61 1300 123 456'

# Customer Data Sample (for documentation)
SAMPLE_CUSTOMER = {
    'name': 'Demo Customer',
    'email': 'demo.customer@example.com',
    'phone': '+61 407 888 999',
    'address': '789 Sample Street, Melbourne VIC 3000',
    'ssn': '123-45-6789',  # US format for international testing
    'ip_address': '203.45.67.89'
}
