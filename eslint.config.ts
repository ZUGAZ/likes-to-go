import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import solid from 'eslint-plugin-solid/configs/typescript';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['.output/', '.wxt/'] },
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	solid,
	prettier,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['*../*'],
							message:
								'Use the @/ alias for src-root-relative imports instead of parent relative (../).',
						},
					],
				},
			],
		},
	},
	{
		files: ['*.config.ts'],
		...tseslint.configs.disableTypeChecked,
	},
);
