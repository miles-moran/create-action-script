const create_action = async () => {
  const fs = require("fs");
  const readline = require("readline");
  const process = require("process");

  const root = "./src";
  const args = process.argv;

  const testing = args.includes("test");

  let rl;

  const data = {
    //Example: billings
    storeName: null,
    //Example: ./src/stores/billing.ts
    storePath: null,
    //Example: BillAction
    actionType: null,
    //Example: pontificate
    actionName: null,
    //Example: billings
    actionFolderName: null,
    //Example:
    actionFolderParent: null,
    //Example:
    actionFolderPath: null,
    //Example: Pontificate
    actionNameCapitalized: null,
    //Example: pontificate
    actionNameNonCapitalized: null,
    //Example: PONTIFICATE
    actionNameUppercase: null,
    //Example: billAction
    actionTypeNonCapitalized: null,
    //Example: Bill
    objectType: null,
    //Example: BILL
    objectTypeUppercase: null,
    //Example: BillActionPontificate.vue
    componentName: null,
    //Example: BillActionPontificate.vue
    hoistPath: null,
    //Example: useCaseStore
    storeExport: null,
    //Example: ["", "Complete", "Cancel"]
    lifecycles: ["", "Complete", "Cancel"],
    //
    newStore: null,
    //
    oldStore: null,
  };

  //General functions for inserting data into a document
  const findFirstStringThatMatchesAndInsert = (string, searches, insertion) => {
    for (const search of searches) {
      if (string.includes(search)) {
        return string.replace(search, `${searches[0]}${insertion}`);
      }
    }
    return null;
  };

  const findFirstRegex = (string, regexes) => {
    for (const re of regexes) {
      const matches = string.match(re);
      if (matches) {
        return matches;
      }
    }
    return null;
  };

  //Assumes all stores sit within ./src/stores
  const getStores = () => {
    const data = [];
    const stores = fs.readdirSync(`${root}/stores`);
    stores.forEach((store) => {
      data.push({ name: store, path: `${root}/stores/${store}` });
    });
    return data;
  };

  //Refactor, regex should be used for all of this but I don't understand it
  const getActions = () => {
    const actions = [];
    const store = fs.readFileSync(data.storePath, "utf-8");
    const reg = /export enum (.*?) {/g;
    const matches = store.match(reg);
    if (!matches) {
      return null;
    }
    for (let match of matches) {
      match = match.replace("export enum ", "");
      match = match.replace(" {", "");
      actions.push({ name: match });
    }
    return actions;
  };

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

  const handleInput = () => {
    const printLine = () => {
      console.log("");
    };
    const printDivider = () => {
      console.log("------------------------------");
    };
    const createDialogue = async (answerFunction, question, options) => {
      if (options) {
        options = options();
        options.forEach((option, i) => {
          console.log(`${i + 1}) ${option.name}`);
        });
        printLine();
      }
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          const parsed = answerFunction(answer, options);
          parsed && console.log(`-> ${parsed} selected.`);
          printLine();
          printDivider();
          printLine();
          resolve(data);
        });
      });
    };

    //Allows for string inputs or index inputs, returns the selection
    const parseSelection = (answer, options) => {
      const floated = parseFloat(answer);
      if (isNaN(floated)) {
        return options.find((option) => option.name === answer);
      }
      return options[floated - 1];
    };

    const storeHandler = (answer, options) => {
      const parsed = parseSelection(answer, options);
      data.storeName = parsed.name;
      data.storePath = parsed.path;
      return parsed.name;
    };
    const typeHandler = (answer, options) => {
      const parsed = parseSelection(answer, options);
      data.actionType = parsed.name;
      return parsed.name;
    };

    const nameHandler = (answer, options) => {
      data.actionName = answer;
      return answer;
    };

    const actionFolderHandler = (answer, options) => {
      const parsed = parseSelection(answer, options);
      data.actionFolderName = parsed ? parsed.name : null;
      data.actionFolderParent = parsed ? parsed.parent : null;
      data.actionFolderPath = parsed ? parsed.path : null;
      return data.actionFolderName;
    };

    const startDialogue = async () => {
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    };
    const endDialogue = () => {
      rl.close();
      console.log("Attemping to write to files...");
      printLine();
      printDivider();
      handleData();
    };

    const handleData = () => {
      const capitalize = (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };
      const nonCapitalize = (string) => {
        return string.charAt(0).toLowerCase() + string.slice(1);
      };
      data.actionNameCapitalized = capitalize(data.actionName);
      data.actionNameNonCapitalized = nonCapitalize(data.actionName);
      data.actionNameUppercase = data.actionName.toUpperCase();
      data.actionTypeNonCapitalized = nonCapitalize(data.actionType);
      data.objectType = data.actionType.replace("Action", "");
      data.objectTypeUppercase = data.objectType.toUpperCase();
      data.componentName = `${data.actionType}${data.actionNameCapitalized}`;
      data.oldStore = fs.readFileSync(data.storePath, "utf-8");
      data.newStore = data.oldStore;
      data.hoistPath = `./src/views/${nonCapitalize(data.actionFolderParent)}/${
        data.actionFolderParent
      }.vue`;

      const matches = findFirstRegex(data.oldStore, [
        /(?<=export function use)(.*)(?=Store)/, //look for traditional functions with use_____store that are beign exported
        /(?<=export const use)(.*)(?=Store)/, //look for arrow functions with use____store that are being exported
      ]);

      data.storeExport = matches ? `use${matches[0]}Store` : "--create-action script error--";
      const modifyActionEnum = () => {
        let lines = "\n";
        data.lifecycles.forEach((l, i) => {
          lines += `${data.actionNameCapitalized}${l} = "${data.objectTypeUppercase}.${
            data.actionNameUppercase
          }${l && "."}${l.toUpperCase()}", ${i === data.lifecycles.length - 1 ? "" : "\n"}`;
        });
        data.newStore = findFirstStringThatMatchesAndInsert(
          data.newStore,
          [`export enum ${data.actionType} {`],
          lines
        );
        !testing && fs.writeFileSync(data.storePath, data.newStore, "utf-8");
      };

      const modifyExecuteFunction = () => {
        let lines = "\n";
        data.lifecycles.forEach((l, i) => {
          lines += `[${data.actionType}.${data.actionNameCapitalized}${l}]: ${
            l ? l.toLowerCase() : "start"
          }${data.actionType},${i === data.lifecycles.length - 1 ? "" : "\n"}`;
        });
        data.newStore = findFirstStringThatMatchesAndInsert(
          data.newStore,
          [`const ${data.actionTypeNonCapitalized}Handlers = {`],
          lines
        );
        !testing && fs.writeFileSync(data.storePath, data.newStore, "utf-8");
      };

      const createComponent = () => {
        const componentBoilerPlate = `
          <template></template>
          
          <script lang="ts">
          import { defineComponent, watch } from "vue";
          import { ${data.storeExport}, ${
          data.actionTypeNonCapitalized
        } } from "@/stores/${data.storeName.replace(".ts", "")}";
          
          export default defineComponent({
            name: "${data.componentName}",
            setup() {
              const { activeAction, execute${data.actionType} } =
                ${data.storeExport}();
              watch(activeAction, (activeAction, prevActiveAction) => {
                if (activeAction !== prevActiveAction && activeAction === ${data.actionType}.${
          data.actionNameCapitalized
        }) {
                 console.log('${data.componentName} executed!')
                 handleComplete();
                }
              });
          
              const handleComplete = async () => {
                execute${data.actionType}(${data.actionType}.${data.actionNameCapitalized}Complete);
              };
          
              return {
          
              };
            },
          });
          </script>
          `;
        !testing &&
          fs.writeFile(
            `${data.actionFolderPath}/${data.actionType}${data.actionNameCapitalized}.vue`,
            componentBoilerPlate,
            (err) => err && console.log(err)
          );
      };

      const attempt = (intention, writeFunction) => {
        try {
          writeFunction();
          printLine();
          console.log(`Success: ${intention}`);
          printLine();
        } catch (e) {
          printLine();
          console.log(`Error: ${intention}`);
          printLine();
          console.log(e);
          return;
        }
      };

      const modifyHoisting = () => {
        const hoister = fs.readFileSync(data.hoistPath, "utf-8");
        let lines = `\n    <${data.componentName} />`;
        let replaced = findFirstStringThatMatchesAndInsert(
          hoister,
          [`<teleport to="#app-hoist-teleport">`],
          lines
        );
        if (!replaced) {
          throw Error;
        }
        lines = `\nimport ${data.componentName} from './${data.actionFolderName}/${data.componentName}.vue';`;
        replaced = findFirstStringThatMatchesAndInsert(replaced, [`} from "vue";`], lines);
        lines = `\n${data.componentName},`;
        replaced = findFirstStringThatMatchesAndInsert(replaced, [`components: {`], lines);
      };
      attempt("Modifying action enums within the store.", modifyActionEnum);
      attempt("Modifying execute function within the store.", modifyExecuteFunction);
      if (data.actionFolderName) {
        attempt(
          "Creating an action component within the selected actions folder.",
          createComponent
        );
        attempt("Importing the action component within the hoisting component.", modifyHoisting);
      }
      printLine();
      console.log("Done");
    };

    //Options must have a name field or options must be null
    const storeDialogue = [storeHandler, "Select a store: ", () => getStores()];
    const typeDialogue = [typeHandler, "Select an action type: ", () => getActions()];
    const nameDialogue = [nameHandler, "Select an action name: ", null];
    const actionFolderDialogue = [
      actionFolderHandler,
      "Select an actions folder (optional, no component will be generated): ",
      () => getFolders(),
    ];

    startDialogue()
      .then(() => createDialogue(...storeDialogue))
      .then(() => createDialogue(...typeDialogue))
      .then(() => createDialogue(...nameDialogue))
      .then(() => createDialogue(...actionFolderDialogue))
      .then(() => endDialogue());
  };

  handleInput();
};

create_action();
