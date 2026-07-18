import { writable } from 'svelte/store';
import { getApiClient } from './api.client';

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrgState {
  orgs: OrgInfo[];
  selectedOrgId: string | null;
  loading: boolean;
}

function createOrgStore() {
  const { subscribe, set, update } = writable<OrgState>({
    orgs: [],
    selectedOrgId: null,
    loading: false,
  });

  return {
    subscribe,

    async fetchOrgs() {
      update(s => ({ ...s, loading: true }));
      try {
        const orgs = await getApiClient().query('org:getUserOrgs', {}) as OrgInfo[];
        update(s => ({ ...s, orgs: orgs || [], loading: false }));
      } catch {
        update(s => ({ ...s, loading: false }));
      }
    },

    setSelectedOrg(orgId: string | null) {
      update(s => ({ ...s, selectedOrgId: orgId }));
    },

    reset() {
      set({ orgs: [], selectedOrgId: null, loading: false });
    },
  };
}

const orgStore = createOrgStore();
export default orgStore;
