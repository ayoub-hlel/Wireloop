<script lang="ts">
    import { goto } from '$app/navigation';
    import { onErrorMessage } from '../../help/alerts';
    // TODO: CLERK_REMOVAL — do not delete yet.
    const loginGoogleUser = async () => {};
    
    async function googleLogin() {
        try {
            await loginGoogleUser();
            await goto("/");
        } catch(e: unknown) {
            console.error('Login error:', e);
            onErrorMessage("Sorry, please try again in 5 minutes. :)", e);
        }
    }
</script>

<div class="flex flex-col items-center justify-center p-8">
    <div class="card-schematic p-10 max-w-md w-full flex flex-col items-center space-y-8">
        <div class="flex flex-col items-center space-y-2">
            <div class="pin-label mb-2">Auth Module v1.0</div>
            <h1 class="text-2xl font-mono font-bold text-primary tracking-tight shadow-glow-blue px-4 py-2 border border-primary/20 rounded-sm">
                INITIALIZE ACCESS
            </h1>
            <p class="text-text-muted text-sm font-sans text-center">
                Secure link to central database required.
            </p>
        </div>

        <div class="trace-divider"></div>

        <button 
            class="btn-schematic flex items-center space-x-3 px-6 py-3 group"
            on:click={googleLogin} 
            type="button" 
            aria-label="Sign in with Google"
        >
            <i class="fa fa-google text-xl group-hover:scale-110 transition-transform"></i>
            <span>CONNECT GOOGLE IDENTITY</span>
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

<style>
</style>
