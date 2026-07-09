import Blockly, { type WorkspaceSvg, Events as BlockEvents } from "blockly";

export const overrideTrashBlocks = (workspace: WorkspaceSvg) => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  (workspace.trashcan as any)?.flyout?.workspace?.addChangeListener(function (event: BlockEvents.Abstract) {
    const workspace = Blockly.Workspace.getById(
      event.workspaceId!
    ) as WorkspaceSvg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trashCan: any = (Blockly.getMainWorkspace() as WorkspaceSvg).trashcan;

    // This handles removing items from the trash can
    // after they have been used
    if (event.type === Blockly.Events.UI) {
      // Deletes them once they have been used
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      const block = workspace.getBlockById((event as any).newValue as string);
      if (!block) return;
      const xml = Blockly.Xml.blockToDom(block);
      const cleanedXML = trashCan.cleanBlockXML_(xml);
      for (let i = 0; i < trashCan.contents_.length; i += 1) {
        const removeDisableStringFromBlock = trashCan.contents_[i].replace(
          / disabled="true"/g,
          ""
        );
        if (cleanedXML === removeDisableStringFromBlock) {
          delete trashCan.contents_[i];
        }
      }

      // Re index item strings in the trash can
      let counter = 0;
      const contentsOfTrashCan = trashCan.contents_;
      const reIndexContents: string[] = [];
      contentsOfTrashCan.forEach(function (content: string) {
        reIndexContents[counter] = content;
        counter += 1;
      });
      trashCan.contents_ = reIndexContents;
      return;
    }

    // Makes sure all the blocks in the trash can are enabled.
    const allBlocks = workspace.getAllBlocks(true);
    allBlocks.forEach(function (block) {
      if (block.type === "arduino_start") {
        block.dispose(true);
      } else {
        block.setEnabled(true);
      }
    });
  });
};
