import { Id, Params } from "@feathersjs/feathers";
import { ActionOptions, Change } from "..";
import { Action } from "../types";
import replace from "object-replace-mustache";

type AnyData = Record<string, any>;

type Arrayable<T> = T | T[];

type ActionServiceCallOptions = {
  service: string
  method: string
  id?: Id
  data: Arrayable<AnyData>
  params?: Params
}

const actionServiceCall = <T>(
  _options: ActionServiceCallOptions
): Action => {
  return async (item: Change<T>, options: ActionOptions<T>) => {
    const { context, view } = options;
    const serviceName = replace(_options.service, view);
    const methodName = replace(_options.method, view);
    const service = context.app.service(serviceName);

    const data = replace(_options.data, view);
    const params = replace(_options.params, view);

    if (["get", "update", "patch", "remove"].includes(methodName)) {
      const id = replace(_options.id, view);
      return await service[methodName](id, data, params);
    } else {
      return await service[methodName](data, params);
    }
  };
};


export default actionServiceCall;