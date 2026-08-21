import { AppError } from "../utils/appError.js";

export function validate(schema, source = "body") {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);

    if (!parsed.success) {
      return next(new AppError("Validation failed", 400, parsed.error.flatten()));
    }

    req.validated = parsed.data;
    return next();
  };
}
