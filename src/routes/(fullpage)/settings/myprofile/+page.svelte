<script lang="ts">
    import Login from "../../../../components/auth/Login.svelte";
    import authStore from "../../../../stores/auth.store";
    import { getApiClient } from "../../../../stores/api.client";
    import { onMount } from "svelte";
    import { wait } from "../../../../helpers/wait";
    import FlashMessage from "../../../../components/wireloop/ui/FlashMessage.svelte";
    import { onErrorMessage } from "../../../../help/alerts";
    let username = $state("");
    let bio = $state("");
    let canSave = $state(true);
    let showMessage = $state(false);
    async function save() {
        if (!canSave || !$authStore.uid) return;
        try {
            canSave = false;
            await getApiClient().mutation('users:updateUserProfile', { userId: $authStore.uid, username, bio });
            await wait(2000);
            canSave = true;
            showMessage = true;
        } catch (e: any) {
            onErrorMessage("Error Saving Profile", e);
        }
    }

    onMount(async () => {
        const unsub = authStore.subscribe(async (auth) => {
            if (!auth.loading && auth.uid) {
                const client = getApiClient();
                const userInfo = await client.query('users:getUserProfile', { userId: auth.uid });
                username = userInfo.username;
                bio = userInfo.bio;
                await wait(10);
                unsub();
            }
        });
    });
</script>

{#if $authStore.isLoggedIn}
    <div class="row">
        <div class="col">
            <div class="form-group">
                <label for="username">Username</label>
                <input bind:value={username} type="text" id="username" class="form-control" />
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col">
            <div class="form-group">
                <label for="bio">Bio</label>
                <textarea bind:value={bio} name="text" id="bio" class="form-control" rows="3"></textarea>
            </div>
        </div>
    </div>
    <div class="row">
        <div class="col">
            <button class="btn btn-success" type="button" onclick={save}>Save</button>
        </div>
    </div>
    <div class="row">
        <div class="col">
            <FlashMessage
                bind:show={showMessage}
                message="Successfully Save." />
        </div>
    </div>
{:else}
    <div class="row">
        <div class="col">
            <p>To access my profile you must login.</p>
            <Login />
        </div>
    </div>
{/if}
