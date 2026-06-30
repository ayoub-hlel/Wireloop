<script lang="ts">
  import authStore from "../../../stores/auth.store";
  import projectStore from "../../../stores/project.store";
  import Login from "../../../components/auth/Login.svelte";
  import { addProject, saveProject } from "../../../firebase/db";
  import { onDestroy } from "svelte";
  import FlashMessage from "../../../components/wireloop/ui/FlashMessage.svelte";
  import { wait } from "../../../helpers/wait";
  import { onErrorMessage } from "../../../help/alerts";
  import { workspaceToXML } from "../../../core/blockly/helpers/workspace.helper";
  import codeStore from "../../../stores/code.store";
  import { saveAs } from "file-saver";

  let showMessage = $state(false);
  let projectName = $state("");
  let projectDescription = $state("");
  let canSave = $state(true);
  let code = $state("");

  const unSubProjectStore = projectStore.subscribe((projectInfo) => {
    if (projectInfo.project) {
      projectName = projectInfo.project.name;
      projectDescription = projectInfo.project.description ?? '';
    }
  });

  onDestroy(() => {
    if (unSubProjectStore) {
      unSubProjectStore();
    }
  });

  async function saveFile() {
    if (!canSave) return;

    canSave = false;
    try {
      if (!$projectStore.projectId) {
        const { projectId, project } = await addProject({
          name: projectName,
          description: projectDescription,
          userId: $authStore.uid,
        } as any);
        projectStore.set({ project: project as any, projectId });
        showMessage = true;
        wait(400);
        canSave = true;
        return;
      }
      const projectToSave = {
        ...($projectStore.project as any),
        name: projectName,
        description: projectDescription,
      };
      await saveProject(projectToSave, $projectStore.projectId);
      projectStore.set({
        projectId: $projectStore.projectId,
        project: projectToSave,
      });
      showMessage = true;
      canSave = true;
    } catch (e: any) {
      onErrorMessage("Please try again in 5 minutes", e);
      canSave = true;
    }
  }

  let unsubCodeStore = codeStore.subscribe((newCode) => {
    code = newCode.code;
  });

  function downloadCode() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "arduino_workflow_builder_code.ino");
  }

  function downloadProject() {
    const blob = new Blob([workspaceToXML() || ''], {
      type: "application/xml;charset=utf-8",
    });
    saveAs(blob, "arduino_workflow_builder_project.xml");
  }

  onDestroy(() => {
    unsubCodeStore();
  });
</script>

<main class="container">
  {#if $authStore.isLoggedIn}
    <div class="row">
      <div class="col">
        <h2>Project Settings</h2>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <div class="form-group">
          <label for="project-name">Name</label>
          <input
            bind:value={projectName}
            type="text"
            name="text"
            id="project-name"
            class="form-control"
          />
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <div class="form-group">
          <label for="project-description">Description</label>
          <textarea
            bind:value={projectDescription}
            name="text"
            id="project-description"
            class="form-control"
            rows="3"
          ></textarea>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <button class="btn btn-success w-100" onclick={saveFile}>Save</button>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <FlashMessage bind:show={showMessage} message="Saved Project." />
      </div>
    </div>
    <div class="row">
      <div class="col">
        <button class="btn btn-info w-100" onclick={downloadProject}>
          Download Project
        </button>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <button class="btn btn-info w-100" onclick={downloadCode}>
          Download Code
        </button>
      </div>
    </div>
  {:else}
    <div class="row">
      <div class="col">
        <p>
          To save a project you must be logged in. You can also copy the code from the Code tab and paste it into the Arduino IDE to upload it to your board.
        </p>
        <Login />
      </div>
    </div>
  {/if}
</main>

<svelte:head>
  <title>Wireloop - Project Settings</title>
</svelte:head>

<style>
  main {
    margin: 10px auto;
  }
  .row {
    margin-bottom: 10px;
  }
</style>
