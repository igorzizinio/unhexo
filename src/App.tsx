import Titlebar from "./lib/components/titlebar";

function App() {
  return (
    <div className={"root h-screen flex flex-col overflow-hidden"}>
      <Titlebar />
      <main class="flex-1 overflow-hidden"></main>
    </div>
  );
}

export default App;
