export const validate = (schema) => (req, res, next) => {
  try {
    const data = {
      body: req.body,
      params: req.params,
      query: req.query
    };

    if (schema) {
      schema.parse(data);
    }

    next();
  } catch (err) {
    return res.status(400).json({
      message: "Validation error",
      errors: err.errors
    });
  }
};
