module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'tree',
        'wizard',
        'relationship',
        'profile',
        'auth',
        'shared-ui',
        'admin',
        'core',
        'design-system',
        'web-user',
        'web-admin',
        'api',
        'database',
      ],
    ],
    'scope-empty': [1, 'never'],
  },
};
