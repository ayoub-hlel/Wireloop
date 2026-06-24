<script lang="ts">
    import { onErrorMessage } from '../../help/alerts';
    import authStore from '../../stores/auth.store';

    let email = $state('');
    let password = $state('');
    let name = $state('');
    let isSignUp = $state(false);
    let submitting = $state(false);

    async function googleLogin() {
        try {
            await authStore.signInSocial('google');
        } catch(e: unknown) {
            console.error('Login error:', e);
            onErrorMessage("Sorry, please try again in 5 minutes. :)", e);
        }
    }

    async function githubLogin() {
        try {
            await authStore.signInSocial('github');
        } catch(e: unknown) {
            console.error('Login error:', e);
            onErrorMessage("Sorry, please try again in 5 minutes. :)", e);
        }
    }

    async function submitEmailForm() {
        if (!email || !password) return;
        submitting = true;
        try {
            if (isSignUp) {
                await authStore.signUp(email, password, name || email.split('@')[0]);
            } else {
                await authStore.signInEmail(email, password);
            }
        } catch(e: unknown) {
            console.error('Auth error:', e);
            onErrorMessage("Authentication failed. Please try again.", e);
        } finally {
            submitting = false;
        }
    }
</script>

<div class="flex flex-col items-center justify-center p-8">
    <div class="card-schematic p-10 max-w-md w-full flex flex-col items-center space-y-8">
        <div class="flex flex-col items-center space-y-2">
            <div class="pin-label mb-2">Auth Module v2.0</div>
            <h1 class="text-2xl font-mono font-bold text-primary tracking-tight shadow-glow-blue px-4 py-2 border border-primary/20 rounded-sm">
                {isSignUp ? 'REGISTER' : 'INITIALIZE ACCESS'}
            </h1>
            <p class="text-text-muted text-sm font-sans text-center">
                {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </p>
        </div>

        <div class="trace-divider"></div>

        {#if isSignUp}
            <input
                bind:value={name}
                placeholder="Display name"
                class="w-full px-4 py-2 bg-bg border border-border rounded-sm font-mono text-sm focus:border-primary/50 outline-none"
            />
        {/if}
        <input
            bind:value={email}
            type="email"
            placeholder="Email"
            class="w-full px-4 py-2 bg-bg border border-border rounded-sm font-mono text-sm focus:border-primary/50 outline-none"
        />
        <input
            bind:value={password}
            type="password"
            placeholder="Password"
            class="w-full px-4 py-2 bg-bg border border-border rounded-sm font-mono text-sm focus:border-primary/50 outline-none"
        />
        <button
            class="btn-schematic w-full py-2"
            onclick={submitEmailForm}
            disabled={submitting}
            type="button"
        >
            {isSignUp ? 'REGISTER' : 'SIGN IN'}
        </button>

        <button
            class="btn-schematic flex items-center space-x-3 px-6 py-3 group"
            onclick={googleLogin}
            type="button"
            aria-label="Sign in with Google"
        >
            <span class="text-lg group-hover:scale-110 transition-transform">G</span>
            <span>{isSignUp ? 'REGISTER WITH' : 'CONNECT'} GOOGLE</span>
        </button>

        <button
            class="btn-schematic flex items-center space-x-3 px-6 py-3 group"
            onclick={githubLogin}
            type="button"
            aria-label="Sign in with GitHub"
        >
            <span class="text-lg group-hover:scale-110 transition-transform">⌂</span>
            <span>{isSignUp ? 'REGISTER WITH' : 'CONNECT'} GITHUB</span>
        </button>

        <button
            class="text-text-muted text-xs underline hover:text-primary transition-colors"
            onclick={() => isSignUp = !isSignUp}
            type="button"
        >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </button>

        <div class="flex items-center space-x-4 opacity-50">
            <div class="flex items-center space-x-2">
                <span class="led led-green"></span>
                <span class="font-mono text-[10px] uppercase">Encryption Active</span>
            </div>
            <div class="flex items-center space-x-2">
                <span class="led led-blue"></span>
                <span class="font-mono text-[10px] uppercase">Secure Port</span>
            </div>
        </div>
    </div>
</div>
