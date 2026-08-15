var root = document.querySelector("#app");
var count = 0;
function render() {
  root.innerHTML = `<h1>BilaScript Web</h1><p>Count: ${count}</p><button id="inc">+1</button>`;
  document.querySelector("#inc").addEventListener("click", () => {
  count++;
  render();
});
}
render();
//# sourceMappingURL=app.js.map
