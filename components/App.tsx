import { PublicRandomLink } from "@/lib/utils";
import Floater from "./Floater";

type AppProps = {
  activeLink: PublicRandomLink | null;
  urlVisitCount: number;
};

const App = ({ activeLink, urlVisitCount }: AppProps) => {
  return (
    <Floater
      activeLink={activeLink as PublicRandomLink}
      urlVisitCount={urlVisitCount}
    />
  );
};

export default App;
