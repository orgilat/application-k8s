import { test as base } from '@playwright/test';
import { ApiClient } from '../helpers/apiClient';

type Fixtures = {
  apiClient: ApiClient;
};

export const test = base.extend<Fixtures>({
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
});

export { expect } from '@playwright/test';
