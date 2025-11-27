import { useState, useEffect, useRef } from 'preact/hooks';

/**
 * Custom hook for implementing intersection observer on cards
 * Used for lazy loading high-quality images
 * @param {boolean} enabled - Whether to enable intersection observer (default: true)
 * @returns {Object} { isVisible, cardRef }
 */
export const useCardIntersection = (enabled = true) => {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);
    
    useEffect(() => {
        if (!enabled || !cardRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisible) {
                    setIsVisible(true);
                }
            },
            {
                rootMargin: '50px',
                threshold: 0.1
            }
        );

        observer.observe(cardRef.current);

        return () => {
            if (cardRef.current) {
                observer.unobserve(cardRef.current);
            }
        };
    }, [enabled, isVisible]);

    return { isVisible, cardRef };
};






