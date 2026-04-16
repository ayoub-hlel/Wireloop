<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { lessons } from '../../../lessons/lessons';

  import { loadProject } from '../../../core/blockly/helpers/workspace.helper';
  import authStore from '../../../stores/auth.store';
  import {
    deleteProject,
    getFile,
    getProject,
    getProjects,
  } from '../../../firebase/db';
  import type { Project } from '../../../firebase/model';
  // Legacy: Firebase Timestamp replaced with Date

  import { onConfirm, onErrorMessage } from '../../../help/alerts';
  import projectStore from '../../../stores/project.store';
  import chunk from 'lodash/chunk';

  const unSubList: Function[] = [];
  let projectList: [Project, string][] = [];
  let searchList: [Project, string][] = [];
  let searchTerm = '';
  let lessonList: any[] = lessons.reduce((acc: any[], lessons: any) => {
    return [...acc, ...lessons.lessons];
  }, []);

  $: filterSearch(searchTerm);

  function filterSearch(term: string) {
    if (term === '') {
      searchList = [...projectList];
      return;
    }
    searchList = searchList.filter(([p, id]) =>
      p.name.toLowerCase().includes(term.toLowerCase())
    );
  }

  async function changeProject(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) {
      return;
    }

    if (
      !(await onConfirm(
        `Do you want to load ${file.name}, this will erase everything that you have done.`
      ))
    ) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async function (evt) {
      if (evt.target!.readyState != 2) return;
      if (evt.target!.error) {
        onErrorMessage('Please upload a valid arduino workflow builder file.', e);
        return;
      }

      projectStore.set({ project: null, projectId: null });
      localStorage.setItem('reload_once_workspace', evt.target!.result as string);
      await goto('/');
    };

    reader.readAsText(file);
  }

  onMount(() => {
    const unSubAuth = authStore.subscribe(async (auth) => {
      if (auth.isLoggedIn) {
        await updateProjectList();
        return;
      }
      projectList = [];
    });
    unSubList.push(unSubAuth);
  });

  async function updateProjectList() {
    if (!$authStore.uid) return;
    try {
      projectList = await getProjects($authStore.uid);
      projectList = [...projectList];
      searchList = [...projectList];
    } catch (e: any) {
      onErrorMessage('Please refresh the page and try again.', e);
    }
  }

  onDestroy(() => {
    unSubList.forEach((s) => s());
  });

  async function onDeleteProject(projectId: string) {
    if (!$authStore.uid) return;
    if (!(await onConfirm('Are you want to delete this project?'))) {
      return;
    }
    try {
      await deleteProject(projectId, $authStore.uid);
      await updateProjectList();
    } catch (e: any) {
      onErrorMessage('Please try again in 5 minutes.', e);
    }
  }

  async function openProject(projectId: string) {
    await goto(`/?projectid=${projectId}`);
    const project = await getProject(projectId);
    const file = await getFile(projectId, $authStore.uid!);
    loadProject(file);
    projectStore.set({ project: project as any, projectId });
  }

  function formatDate(timestamp: Date | string | null): string {
    if (timestamp instanceof Date) {
      return timestamp.toDateString();
    }
    if (!timestamp) return '';

    // Legacy: Handle any remaining non-Date objects
    const date = new Date(timestamp);

    return date.toDateString();
  }
</script>

<main class="container-fluid overflow-scroll mb-5 pb-5">
  <h2 class="mt-3">Projects</h2>
  <hr />
  <label for="file-upload" class="form custom-file-upload">
    <i class="fa fa-cloud-upload" />
    Open a project from your computer
  </label>
  <input on:change={changeProject} id="file-upload" type="file" />
  <hr />
    {#if projectList.length > 0 && $authStore.isLoggedIn}
      <h3>Your Projects</h3>
      <div class="form-group">
        <label for="search">Search</label>
        <input bind:value={searchTerm} type="text" id="search" class="form-control" />
      </div>

      <table class="table table-hover table-bordered">
        <thead>
          <tr>
            <th>Name</th>
            <th>Modified</th>
            <th />
            <th />
          </tr>
        </thead>
        <tbody>
          {#each searchList as project}
            <tr>
              <td>{project[0].name}</td>
              <td>{formatDate(project[0].updated)}</td>
              <td>
                <button
                  class="btn btn-info w-100"
                  on:click={() => openProject(project[1])}
                >
                  Open
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="btn btn-link p-0"
                  on:click={() => onDeleteProject(project[1])}
                  aria-label="Delete project: {project[0].name}"
                >
                  <i class="fa fa-trash" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
  {/if}
    <div class="row">
      <div class="col-3">
        <h2 class="p-0">Demo Projects!</h2>
      </div>
      <div class="col-9 legend">
        <img src="/example-projects/easy.png" alt="difficulty-level" class="legend easy"  >
        <span class="easy">Easy</span>
        <img src="/example-projects/medium.png" alt="difficulty-level" class="legend medium"  >
        <span class="medium">Medium</span>
        <img src="/example-projects/hard.png" alt="difficulty-level" class="legend hard" >
        <span class="hard">Hard</span>
      </div>
    </div>
    <!-- <div class="row legend">
        <img src="/example-projects/easy.png" alt="difficulty-level" >
        <p class="text-center w-100 mb-2">Easy</p>
        <img src="/example-projects/medium.png" alt="difficulty-level" >
        <p class="text-center w-100 mb-2">Medium</p>
        <img src="/example-projects/hard.png" alt="difficulty-level" >
        <p class="text-center w-100 mb-2">Hard</p>
    </div> -->
        
      {#each chunk(lessonList, 3) as lessonRow }
        <div class="row g-2 g-lg-3">
          {#each lessonRow as lesson }
          <div class="col-4">
            <div class="card" on:click={() => goto(`/?example_project=${lesson.file}`)}>
              <div class="card-body">
                <img loading="lazy" src={lesson.levelImage} alt="difficulty-level" class="level">
                <h5 class="card-title">{lesson.title}</h5>
              </div>
              <img src={lesson.image} class="card-img-bottom" alt={lesson.title}>
            </div>
          </div>
          
          {/each}
        </div>
      {/each}
      
</main>
<svelte:head>
  <title>Arduino Workflow Builder - Projects</title>
</svelte:head>

<style>
  .container-fluid {
    height: 99vh;
  }
 
 img.card-img-bottom {
  width: 100%;
  height: 40vh;
  object-fit: cover;
 }
 .card-body {
  position: relative;
 }
 .card {
  cursor: pointer;
 }
 .level {
  width: 25px;
  height: 25px;
  position: absolute;
  right: 5px;
  top: 15px;
 }
 .legend {
   position: relative;
 }
  .legend img {
    width: 25px;
    height: 25px;
    position: absolute;
  }
  .legend img.easy {
    left: 10px;
  }
 
  .legend img.medium {
    left: 100px;
  }
  .legend span {
    position: absolute;
    top: 30px;
  }
  .legend span.easy {
    left: 5px;
  }

  .legend span.medium {
    left: 80px;
  }

  .legend span.hard {
    left: 173px;
  }

  .legend img.hard {
    left: 180px;
  }
 
</style>
