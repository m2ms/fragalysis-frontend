import { createContext, useContext } from 'react';

export const ReviewContext = createContext(null);

export const useReview = () => useContext(ReviewContext);
