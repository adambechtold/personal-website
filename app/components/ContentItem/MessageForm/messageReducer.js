export const INITIAL_STATE = {
  loading: false,
  error: false,
  success: false,
};

export const messageReducer = (state, action) => {
  if (!action.type) {
    console.log("No action type provided");
    return state;
  }

  switch (action.type) {
    case "MESSAGE_START":
      return {
        ...state,
        loading: true,
      };
    case "MESSAGE_SUCCESS":
      return {
        ...state,
        loading: false,
        success: true,
        error: false,
      };
    case "MESSAGE_ERROR":
      return {
        ...state,
        loading: false,
        success: false,
        error: true,
      };
    default:
      return state;
  }
};
