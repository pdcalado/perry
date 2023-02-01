import { Resolver } from "perrydl";

class Wrapper {
    private resolver: Resolver | undefined;

    setInner = (resolver: Resolver) => {
        this.resolver = resolver;
    };

    use = () => this.resolver!;

    tryUse = () => this.resolver;
}

export const DupeAPI = new Wrapper();
