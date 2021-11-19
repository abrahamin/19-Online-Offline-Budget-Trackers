let db;

// create a new db request for a "budget" database.
const request = indexedDB.open("Budget", 1);

request.onupgradeneeded = function (e) {
  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  db = e.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore("BudgetStore", { autoIncrement: true });
  }
};

request.onsuccess = function (e) {
  db = e.target.result;

  // check if app is online before reading from db
  if (navigator.onLine) {
    checkDatabase();
  }
};

request.onerror = function (e) {
  console.log(`Error! ${e.target.errorCode}`);
};

const saveRecord = (record) => {
  // create a transaction on the BudgetStore db with readwrite access
  const transaction = db.transaction(["BudgetStore"], "readwrite");

  // access the BudgetStore object store
  const store = transaction.objectStore("BudgetStore");

  // add record to the store with add method.
  store.add(record);
};

function checkDatabase() {
  // open a transaction on the BudgetStore db
  let transaction = db.transaction(["BudgetStore"], "readwrite");

  // access the BudgetStore object
  const store = transaction.objectStore("BudgetStore");

  // get all records from store and set to a variable
  const getAll = store.getAll();

  // if the request was successful
  getAll.onsuccess = function () {
    // if there are items in the store, bulk add them for use when back online
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // if returned response is not empty
          if (res.length !== 0) {
            // open another transaction to BudgetStore with the ability to read and write
            transaction = db.transaction(["BudgetStore"], "readwrite");

            // assign the current store to a variable
            const currentStore = transaction.objectStore("BudgetStore");

            // clear existing entries because bulk add was successful
            currentStore.clear();
          }
        });
    }
  };
}
