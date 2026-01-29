// Application Configuration with Sensitive Data
const config = {
  database: {
    host: '192.168.1.100',
    port: 5432,
    username: 'admin',
    password: 'super_secret_123'
  },

  email: {
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      from: 'noreply@company.com',
      auth: {
        user: 'smtp.user@company.com',
        pass: 'email_password_456'
      }
    },
    adminEmail: 'admin@company.com',
    supportEmail: 'support@company.com'
  },

  api: {
    endpoints: {
      customer: 'https://api.company.com/customers',
      payment: 'https://api.company.com/payments'
    },
    keys: {
      stripe: 'sk_live_51HxYzABCDEFGH123456789',
      sendgrid: 'SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ123456.AbCdEfGhIjKlMnOpQrStUvWxYz123456789'
    }
  },

  testAccounts: [
    {
      email: 'test.user1@company.com',
      phone: '+61 412 345 678',
      customerId: 'CUST-00012345'
    },
    {
      email: 'test.user2@company.com',
      phone: '0423 456 789',
      customerId: 'CUST-00067890'
    }
  ],

  banking: {
    gateway: {
      bsb: '123-456',
      accountNumber: '987654321',
      merchantId: 'MERCH-123456'
    },
    testCards: [
      '4532 1234 5678 9010', // Visa
      '5425 2334 3010 9903', // MasterCard
      '3714 4963 5398 431'   // Amex
    ]
  },

  compliance: {
    tfn: '123 456 789',
    abn: '12 345 678 901',
    medicareProvider: '2234 56789 1'
  }
};

module.exports = config;
