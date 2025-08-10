import { defineBoot } from '#q-app/wrappers';
import { useUserStore } from '@/stores/user';

export default defineBoot(async ({ router }) => {
  const userStore = useUserStore();
  
  // Initialize the mock user system before router starts
  try {
    await userStore.initializeUsers();
    
    // Try to restore previous user from localStorage
    await userStore.restoreUser();
    
    // If still no user, ensure at least one user is selected
    if (!userStore.isLoggedIn && userStore.availableUsers.length > 0) {
      await userStore.switchUser(userStore.availableUsers[0]!.userId);
    }
    
    console.log('Auth boot: User system initialized', {
      currentUser: userStore.currentUser?.name,
      isLoggedIn: userStore.isLoggedIn
    });
  } catch (error) {
    console.error('Auth boot: Failed to initialize user system:', error);
  }
});