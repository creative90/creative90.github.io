const io = require('socket.io-client')

const socket = io('http://localhost:5000/api/v1/chatbot')


const main = document.querySelector(".main");
const overlay = document.querySelector(".overlay");
const inputBoard = document.querySelector(".input-board");
const formOverlay = document.querySelector(".form-overlay");
const btnSendOverlay = document.querySelector(".btn-send-overlay");

const navMenu = document.querySelector(".nav-menu");
const btnMenu = document.querySelector(".btn-menu");
const btnMenuCancel = document.querySelector(".btn-cancel");
const formChatbox = document.querySelector(".form-chatbox");

btnMenu.addEventListener("click", showMenu);
btnMenuCancel.addEventListener("click", hideMenu);

let data,
  username,
  present_id,
  numOfServerItems = 10;
//  DEALING WITH THE OVERLAY

formOverlay.addEventListener("submit", async (e) => {
  e.preventDefault();

  username = e.target.elements["form-overlay-input"].value;

  loading(data, renderLoader);
  const dots = document.querySelector(".dots");

  if (!username) return;

  overlay.classList.add("hide");
  inputBoard.classList.add("hide");

  data = await makeCallToAPI("", "", "POST", username);

  removeLoader(dots);

  renderServerMessage(data);
  data = "";
});

formChatbox.addEventListener("submit", async (e) => {
  e.preventDefault();
  // 1.) run input validation on client input
  let clientMessage = e.target.elements["chatbox-input"].value;

  if (clientMessage) renderMessage(clientMessage);

  loading(data, renderLoader);
  const dots = document.querySelector(".dots");
  const routes = ["99", "98", "97", "0"];

  if (
    Number(clientMessage) > 99 ||
    (clientMessage > numOfServerItems && clientMessage < 97) ||
    isNaN(clientMessage) ||
    (!present_id && clientMessage != 1 && !routes.includes(clientMessage))
  ) {
    setTimeout(async () => {
      removeLoader(dots);
      renderServerMessage({
        message: `Please make a request using bot instructions`,
      });
      renderServerMessage({
        message: `a. Select 1 to Place an order <br/> b. Select 99 to checkout order <br/> c. Select 98 to see order history <br/> d. Select 97 to see current order <br/> e. Select 0 to cancel order.`,
      });
    }, 1500);
    e.target.elements["chatbox-input"].value = "";
    return;
  }

  e.target.elements["chatbox-input"].value = "";

  if (clientMessage) {
    if (present_id == 1 && clientMessage && !routes.includes(clientMessage)) {
      data = await makeCallToAPI(present_id, clientMessage);
    }

    if (!present_id && clientMessage == "1")
      data = await makeCallToAPI(clientMessage);

    if (routes.includes(clientMessage)) {
      data = await makeCallToAPI(clientMessage);
    }

    removeLoader(dots);

    renderServerMessage(data);

    if (clientMessage == "1") present_id = clientMessage;
  }
  data = "";
});

function showMenu() {
  navMenu.classList.remove("hide-menu");
  navMenu.classList.add("show-menu");
  socket.emit("message", inputBoard.value)
}

function hideMenu() {
  navMenu.classList.remove("show-menu");
  navMenu.classList.add("hide-menu");
}

// DEALING WITH CLIENT INPUTS
function renderMessage(message) {
  // 2.) create markup for client text
  const markup = `
        <div class="msg client-message">
          <p>${message}</p>
        </div>`;

  //  3.) render text to DOM
  main.insertAdjacentHTML("afterbegin", markup);
}

async function makeCallToAPI(id = "", endpoint = "", method = "GET", username) {
  try {
    const options = {
      method,
      mode: "cors",
      credentials: "include",
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Access-Control-Allow-Origin":
    
        // github.io
        "https://localhost:5000",
      },
    };

    const body = JSON.stringify({ username });

    method == "POST" ? (options.body = body) : "";

    const res = await fetch(
      `https://my-chatbot-api.onrender.com${
        id ? "/" : ""
      }${id}${endpoint ? "/" : ""}${endpoint}`,

      options
      
    );

    return await res.json();
  } catch (error) {
    renderServerMessage({
      message: `The server is down at this time, please try again later`,
    });
  }
}

function renderLoader(markup) {
  main.insertAdjacentHTML("afterbegin", markup);
}

function removeLoader(element) {
  main.removeChild(element);
}

function renderServerMessage(data) {
  const messageHTML = displayData(data);
  const messages = ["Order cancelled😓.", "Order Placed👍."];
  if (messages.includes(data.message)) present_id = "";
  const markup = `
    <div class="msg server-message">
      <p>${data.message}</p>
      ${messageHTML ? "<br/>" : ""}
        ${messageHTML}
    </div>
  `;
  main.insertAdjacentHTML("afterbegin", markup);
}

function displayData(data) {
  const dataObj = data.data;

  if (!dataObj) return "";

  // constructs order instructions from server
  if (dataObj.instructions) {
    const p = document.createElement("p");
    dataObj.instructions.forEach((el) => {
      p.insertAdjacentHTML(
        "beforeend",
        `${el.option}. ${el.instruction} <br/>`
      );
    });
    return p.innerHTML;
  }

  // constructs list of items from server
  if (dataObj.Items) {
    const p = document.createElement("p");
    dataObj.Items.forEach((el) => {
      p.insertAdjacentHTML("beforeend", `${el.id}. ${el.item} <br/>`);
    });
    return p.innerHTML;
  }

  // constructs order history from server
  if (dataObj.orders) {
    const div = document.createElement("div");
    let count = 0;
    dataObj.orders.forEach((el) => {
      const markup = `
        <div> 
          <span>${++count}. ${el.dateCreated}</span>
          <p> <em>*</em> You Bought ${el.itemsCount} items</p>
          <p> <em>*</em> ${el.items.map((elem) => ` ${elem.item}`)}</p>
          <span> <em>*</em> Total Amount: $${el.amount}</span>
        </div>
        <br/>
      `;
      div.insertAdjacentHTML("beforeend", markup);
    });

    return div.innerHTML;
  }

  // select an item
  if (dataObj.order) {
    const div = document.createElement("div");
    let count = 0;

    const { itemsCount, items, amount } = dataObj.order;

    const markup = `
        <div> 
          <p>${itemsCount} item(s) selected</p>
          <span>Total Amount: $${amount}</span>
        </div>
      `;
    div.insertAdjacentHTML("beforeend", markup);

    return div.innerHTML;
  }

  // select an item
  if (dataObj.currentOrder) {
    const div = document.createElement("div");
    let count = 0;

    const { itemsCount, items, amount } = dataObj.currentOrder;

    const markup = `
        <div> 
          <p>${itemsCount} item(s) selected</p>
           <p>${items.map(
             (elem) => `${++count}. ${elem.item} - $${elem.amount}\n`
           )}</p>
          <span>Total Amount: $${amount}</span>
        </div>
        <br/>
      `;
    div.insertAdjacentHTML("beforeend", markup);

    return div.innerHTML;
  }
}

// STRICTLY CLIENT SIDE

const themeIcon = document.querySelector(".nav-theme-icon");

themeIcon.addEventListener("click", toggletheme);

function toggletheme() {
  themeIcon.children[1].textContent =
    themeIcon.children[1].textContent == "Light mode"
      ? "Dark mode"
      : "Light mode";
  if (themeIcon.children[1].textContent == "Dark mode") {
    themeIcon.children[0].classList.remove("fa-sun");
    themeIcon.children[0].classList.add("fa-moon");
    document.documentElement.classList.add("dark");
  } else {
    themeIcon.children[0].classList.remove("fa-moon");
    themeIcon.children[0].classList.add("fa-sun");
    document.documentElement.classList.remove("dark");
  }
}

function loading(data, func) {
  const markup = `
    <div class="dots">
        <span class="dot dot-1"></span>
        <span class="dot dot-2"></span>
        <span class="dot dot-3"></span>
    </div>
    `;
  if (!data) func(markup);
}
