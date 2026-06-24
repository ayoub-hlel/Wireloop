// ponytail: compat shim — redirects to Better Auth
import authStore from '../stores/auth.store';

export const loginGoogleUser = async () => {
  await authStore.signInSocial('google');
};

export const logout = async () => {
  await authStore.signOut();
};
