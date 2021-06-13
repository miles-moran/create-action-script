const fs = require("fs");
const readline = require("readline");
const process = require("process");

//this script assumes that the stores are kept within src/stores and that folders containing actions are contained within a folder within a folder in views, with 'Actions' in the name
const root = "./src";
const args = process.argv;

const testing = args.includes("test"); //by default, this script writes to files
const sample = args.includes("sample"); //by default, this script uses user input as data

const sampleData = {
  folder: {
    name: "BillActions",
    path: "./src/views/Billing/BillActions",
    parent: "Billing",
  },
  store: { name: "billing.ts", path: "./src/stores/billing.ts" },
  name: "pontificate",
};

//reusable functions for finding things in files or modifying things in files
const findFirstRegex = (string, regexes) => {
  for (const re of regexes) {
    const matches = string.match(re);
    if (matches) {
      return matches;
    }
  }
  return null;
};

const findFirstStringThatMatchesAndInsert = (string, searches, insertion) => {
  for (const search of searches) {
    if (string.includes(search)) {
      return string.replace(search, `${searches[0]}${insertion}`);
    }
  }
  return null;
};

const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};
const nonCapitalize = (string) => {
  return string.charAt(0).toLowerCase() + string.slice(1);
};

const createAction = async () => {
  //TODO: Change to recursively look for folders with 'Actions' in the name.
  //TODO: Make this function reusable by the getStores component, for other the addition of other scripts
  const getFolders = () => {
    const af = [];
    const viewFiles = fs.readdirSync(`${root}/views`);
    viewFiles.forEach((viewFile) => {
      const vFiles = fs.statSync(`${root}/views/${viewFile}`).isDirectory()
        ? fs.readdirSync(`${root}/views/${viewFile}`)
        : [];
      vFiles.forEach((vFile) => {
        vFile.includes("Actions") &&
          af.push({
            name: vFile,
            parent: `${viewFile}`,
            path: `${root}/views/${viewFile}/${vFile}`,
          });
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
      console.log("----------------------------------------------------");
      rl.question("Pick an actions folder: ", (answer) => {
        // TODO: Log the answer in a database
        console.log("");
        console.log(`-> ${answer} folder selected.`);
        console.log("");
        data.folder = answer;
        resolve(data);
      });
    });
  };

  const selectStoreDialogue = (data) => {
    return new Promise((resolve) => {
      stores.forEach((f, i) => console.log(`${i + 1}) ${f.name} - ${f.path}`));
      console.log("----------------------------------------------------");
      rl.question("Pick a store: ", (answer) => {
        // TODO: Log the answer in a database

        console.log(`-> ${answer} store selected.`);
        console.log("");
        data.store = answer;
        resolve(data);
      });
    });
  };

  const selectNameDialogue = (data) => {
    console.log("Action name examples: Archive, CreatePackage, Place, CreateBills, ApproveBill");
    return new Promise((resolve) => {
      rl.question("Pick an action name: ", (answer) => {
        console.log("----------------------------------------------------");
        // TODO: Log the answer in a database
        rl.close();
        console.log(`-> ${answer} name selected.`);
        console.log("");
        data.name = answer;
        resolve(data);
      });
    });
  };

  let data = {};

  if (sample) {
    data = sampleData;
    rl.close();
  } else {
    //HANDLE INPUT
    const input = await selectFolderDialogue({ folder: "", store: "", name: "" })
      .then(selectStoreDialogue)
      .then(selectNameDialogue)
      .then((res) => res);

    data = {
      folder: folders.find((folder) => folder.name === input.folder),
      store: stores.find((store) => store.name === input.store),
      name: input.name,
    };
  }

  //SAMPLE INPUT

  //Example: pontificate
  const actionName = data.name;
  //Example: Pontificate
  const actionNameCapitalized = capitalize(actionName);
  //Example: pontificate
  const actionNameNonCapitalized = nonCapitalize(actionName);
  //Example: PONTIFICATE
  const actionNameUppercase = actionName.toUpperCase();
  //Example: BillAction (based off of actions folder name, but made singular: BillActions -> BillAction)
  const actionType = data.folder.name.substring(0, data.folder.name.length - 1);
  //Example: billAction
  const actionTypeNonCapitalized = nonCapitalize(actionType);
  //Example: Bill
  const objectType = actionType.replace("Action", "");
  //Example: BILL
  const objectTypeUppercase = objectType.toUpperCase();
  //Example: BillActionCreate
  const componentName = `${actionType}${actionNameCapitalized}`;
  //Example: ./src/views/billing/Billing.vue
  const hoistPath = `./src/views/${nonCapitalize(data.folder.parent)}/${data.folder.parent}.vue`;

  //TODO: add refresh lifecycle hook
  //"" = default lifecycle
  const lifecycles = ["", "Complete", "Cancel"];

  let store = fs.readFileSync(data.store.path, "utf-8");
  const matches = findFirstRegex(store, [
    /(?<=export function use)(.*)(?=Store)/, //look for traditional functions with use_____store that are beign exported
    /(?<=export const use)(.*)(?=Store)/, //look for arrow functions with use____store that are being exported
  ]);
  const storeExport = `use${matches[0]}Store`;

  //MODIFYING IN SELECTED STORE
  const modifyActionEnum = () => {
    let store = fs.readFileSync(data.store.path, "utf-8");
    let lines = "\n";
    lifecycles.forEach((l, i) => {
      lines += `  ${actionNameCapitalized}${l} = "${objectTypeUppercase}.${actionNameUppercase}${
        l && "."
      }${l.toUpperCase()}", ${i === lifecycles.length - 1 ? "" : "\n"}`;
    });
    let replaced = findFirstStringThatMatchesAndInsert(
      store,
      [`export enum ${actionType} {`],
      lines
    );
    console.log("----------------------------------------------------");
    console.log(`Attempting to write lines to ${data.store.path}`);
    console.log(" ");
    console.log(lines);
    console.log(" ");
    if (replaced === store) {
      console.log(`-> Failure`);
    } else {
      console.log(`-> Sucess`);
      !testing && fs.writeFileSync(data.store.path, replaced, "utf-8");
    }
  };

  const modifyExecuteFunction = () => {
    let store = fs.readFileSync(data.store.path, "utf-8");
    let lines = "\n";
    lifecycles.forEach((l, i) => {
      lines += `    [${actionType}.${actionNameCapitalized}${l}]: ${
        l ? l.toLowerCase() : "start"
      }${actionType},${i === lifecycles.length - 1 ? "" : "\n"}`;
    });
    let replaced = findFirstStringThatMatchesAndInsert(
      store,
      [`const ${actionTypeNonCapitalized}Handlers = {`],
      lines
    );
    console.log("----------------------------------------------------");
    console.log(`Attempting to write lines to ${data.store.path}`);
    console.log(" ");
    console.log(lines);
    console.log(" ");
    if (replaced === store) {
      console.log("-> Failure");
    } else {
      console.log(`-> Sucess`);
      !testing && fs.writeFileSync(data.store.path, replaced, "utf-8");
    }
  };
  //WORK IN PROGRESS
  const modifyActionPermissions = () => {};
  //WORK IN PROGRESS
  //CREATING COMPONENT IN SELECTED ACTION FOLDER
  const createComponent = () => {
    const componentBoilerPlate = `
    <template></template>
    
    <script lang="ts">
    import { defineComponent, watch } from "vue";
    import { ${storeExport}, ${actionType} } from "@/stores/${data.store.name.replace(".ts", "")}";
    
    export default defineComponent({
      name: "${componentName}",
      setup() {
        const { activeAction, execute${actionType} } =
          ${storeExport}();
        watch(activeAction, (activeAction, prevActiveAction) => {
          if (activeAction !== prevActiveAction && activeAction === ${actionType}.${actionNameCapitalized}) {
           console.log('${componentName} executed!')
           handleComplete();
          }
        });
    
        const handleComplete = async () => {
          execute${actionType}(${actionType}.${actionNameCapitalized}Complete);
        };
    
        return {
    
        };
      },
    });
    </script>
    `;

    console.log("----------------------------------------------------");
    console.log(`Attempting to create a component in ${data.folder.name} folder`);
    console.log(" ");
    !testing &&
      fs.writeFile(
        `${data.folder.path}/${actionType}${actionNameCapitalized}.vue`,
        componentBoilerPlate,
        (err) => err && console.log(err)
      );
    console.log("-> Success");
    console.log("----------------------------------------------------");
    console.log(" ");
  };

  const modifyHoisting = () => {
    console.log("----------------------------------------------------");
    console.log(`Attempting to write lines to ${hoistPath}`);
    const hoister = fs.readFileSync(hoistPath, "utf-8");
    let lines = `\n    <${componentName} />`;
    let replaced = findFirstStringThatMatchesAndInsert(
      hoister,
      [`<teleport to="#app-hoist-teleport">`],
      lines
    );
    if (!replaced) {
      console.log(" ");
      console.log("No hoister found in file");
      console.log(" ");
      console.log("-> Failure");
      return;
    }
    console.log(lines);
    lines = `\nimport ${componentName} from './${data.folder.name}/${componentName}.vue';`;
    replaced = findFirstStringThatMatchesAndInsert(replaced, [`} from "vue";`], lines);
    console.log(lines);
    lines = `\n    ${componentName},`;
    replaced = findFirstStringThatMatchesAndInsert(replaced, [`components: {`], lines);
    console.log(lines);

    if (replaced === hoister) {
      console.log("-> Failure");
    } else {
      console.log(`-> Sucess`);
      !testing && fs.writeFileSync(hoistPath, replaced, "utf-8");
    }
    console.log(" ");
  };
  //Modifying store
  modifyExecuteFunction();
  modifyActionEnum();
  modifyActionPermissions();
  //Creating component within actions folder
  createComponent();
  //Hoisting
  modifyHoisting();
};

createAction();

