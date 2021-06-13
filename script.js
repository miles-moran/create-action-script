# create-action-script

//this script assumes that the stores are kept within src/stores and that folders containing actions are contained within a folder within a folder in views, with 'Actions' in the name

const fs = require("fs");
const readline = require("readline");

const root = "./src";
const run = async () => {
  //TODO: Change this to recursively look for all folders with 'Actions' in the name?
  const getFolders = () => {
    const af = [];
    const viewFiles = fs.readdirSync(`${root}/views`);
    viewFiles.forEach((viewFile) => {
      const vFiles = fs.statSync(`${root}/views/${viewFile}`).isDirectory()
        ? fs.readdirSync(`${root}/views/${viewFile}`)
        : [];
      vFiles.forEach((vFile) => {
        vFile.includes("Actions") &&
          af.push({ name: vFile, path: `${root}/views/${viewFile}/${vFile}` });
      });
    });
    return af;
  };

  const getStores = () => {
    const s = [];
    const stores = fs.readdirSync(`${root}/stores`);
    stores.forEach((store) => {
      s.push({ name: store, path: `${root}/stores/${store}` });
    });
    return s;
  };

  const folders = getFolders();
  const stores = getStores();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const selectFolderDialogue = (data) => {
    return new Promise((resolve) => {
      folders.forEach((f, i) => console.log(`${i + 1}) ${f.name} - ${f.path}`));
      rl.question("Pick an actions folder:  ", (answer) => {
        // TODO: Log the answer in a database
        console.log("--------------------------");
        console.log(`${answer} folder selected`);
        console.log("");
        data.folder = answer;
        resolve(data);
      });
    });
  };

  const selectStoreDialogue = (data) => {
    return new Promise((resolve) => {
      stores.forEach((f, i) => console.log(`${i + 1}) ${f.name} - ${f.path}`));
      rl.question("Pick a store:  ", (answer) => {
        // TODO: Log the answer in a database
        console.log("--------------------------");
        console.log(`${answer} store selected`);
        console.log("");
        data.store = answer;
        resolve(data);
      });
    });
  };

  const selectNameDialogue = (data) => {
    return new Promise((resolve) => {
      rl.question("Pick an action name:  ", (answer) => {
        // TODO: Log the answer in a database
        rl.close();
        console.log("--------------------------");
        console.log(`${answer} name selected`);
        console.log("");
        data.name = answer;
        resolve(data);
      });
    });
  };

  const input = await selectFolderDialogue({ folder: "", store: "", name: "" })
    .then(selectStoreDialogue)
    .then(selectNameDialogue)
    .then((res) => res);

  const data = {
    folder: folders.find((folder) => folder.name === input.folder),
    store: stores.find((store) => store.name === input.store),
    name: input.name,
  };

  console.log(data);

  //   createComponent(data);
};

// run();

const data = {
  folder: { name: "BillActions", path: "./src/views/Billing/BillActions" },
  store: { name: "billing.ts", path: "./src/stores/billing.ts" },
  name: "pontificate",
};

const actionName = data.name;
const actionNameCapitalized = actionName.charAt(0).toUpperCase() + actionName.slice(1);
const actionNameNonCapitalized = actionName.charAt(0).toLowerCase() + actionName.slice(1);
const actionType = data.folder.name.substring(0, data.folder.name.length - 1); //make action folder name singular
const actionTypeNonCapitalized = actionType.charAt(0).toLowerCase() + actionType.slice(1);
const objectType = actionType.replace("Action", ""); //objectType

const lifecycles = ["", "Complete", "Cancel"];

const modifyActionEnum = () => {
  let store = fs.readFileSync(data.store.path, "utf-8");
  let lines = "";
  lifecycles.forEach((l, i) => {
    lines += `  ${actionNameCapitalized}${l} = "${objectType.toUpperCase()}.${actionName.toUpperCase()}${
      l && "."
    }${l.toUpperCase()}", ${i === lifecycles.length - 1 ? "" : "\n"}`;
  });
  const insertArea = store.includes(`export enum ${actionType} { `)
    ? `export enum ${actionType} { `
    : `export enum ${actionType} {`;
  let replaced = store.replace(insertArea, `${insertArea.trim()}\n ${lines}`);
  if (replaced === store) {
    console.log(`Failed to add enum modications to ${data.store.name}`);
  } else {
    console.log(`succeeded in writing enum modications to ${data.store.name}`);
    fs.writeFileSync(data.store.path, replaced, "utf-8");
  }
};

const modifyExecuteFunction = () => {
  let store = fs.readFileSync(data.store.path, "utf-8");
  let lines = "";
  lifecycles.forEach((l, i) => {
    lines += `  [${actionType}.${actionNameCapitalized}${l}]: ${
      l ? l.toLowerCase() : "start"
    }${actionType},${i === lifecycles.length - 1 ? "" : "\n"}`;
  });
  console.log(lines);
  console.log(`const ${actionTypeNonCapitalized}Handlers = {`);
  const insertArea = store.includes(`export enum ${actionType} { `)
    ? `const ${actionTypeNonCapitalized}Handlers = { `
    : `const ${actionTypeNonCapitalized}Handlers = {`;
  let replaced = store.replace(insertArea, `${insertArea.trim()}\n ${lines}`);
  if (replaced === store) {
    console.log(`Failed to add to execute function to ${data.store.name}`);
  } else {
    console.log(`succeeded to execute function to ${data.store.name}`);
    fs.writeFileSync(data.store.path, replaced, "utf-8");
  }
};

const createComponent = () => {
  const componentBoilerPlate = `
    <template></template>
    
    <script lang="ts">
    import { defineComponent, watch } from "vue";
    import { useCasesStore, ${actionType} } from "@/stores/${data.store.name.replace(".ts", "")}";
    
    export default defineComponent({
      name: "${data.name}",
      setup() {
        const { activeAction, executeCaseAction } =
          useCasesStore();
        watch(activeAction, (activeAction, prevActiveAction) => {
          if (activeAction !== prevActiveAction && activeAction === ${actionType}.${actionNameCapitalized}) {
           console.log('${data.name} executed')
           handleComplete();
          }
        });
    
        const handleComplete = async () => {
          executeCaseAction(${actionType}.${actionNameCapitalized}Complete);
        };
    
        return {
    
        };
      },
    });
    </script>
    `;

  fs.writeFile(
    `${data.folder.path}/${actionType}${actionNameCapitalized}.vue`,
    componentBoilerPlate,
    (err) => (err ? console.log(err) : console.log("Success"))
  );
};

createComponent();
modifyExecuteFunction();
modifyActionEnum();
