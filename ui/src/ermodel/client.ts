import { castModel, ModelSpec } from "perrydl";
import { JsonServer } from "utils";

class EntityRelationClient extends JsonServer {
    getModel = async (): Promise<ModelSpec> => {
        const model = await this.get("/models?tenant=sampleperry");
        return castModel(model as object);
    };
}

export default EntityRelationClient;
