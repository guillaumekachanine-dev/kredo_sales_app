"use client"

import { Children, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import styles from "./MobileOverviewCarousel.module.css"

export interface MobileOverviewCarouselItem {
  label: string
}

interface MobileOverviewCarouselProps {
  items: readonly MobileOverviewCarouselItem[]
  children: ReactNode
  ariaLabel: string
}

/**
 * Carrousel tactile partagé pour les Overviews ayant plusieurs visualisations
 * de même niveau. Il ne connaît ni les données ni le rendu de chaque slide.
 */
export function MobileOverviewCarousel({ items, children, ariaLabel }: MobileOverviewCarouselProps) {
  const [activeSlide, setActiveSlide] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<Array<HTMLElement | null>>([])
  const slides = Children.toArray(children)

  useEffect(() => {
    const carousel = carouselRef.current
    const slide = slideRefs.current[activeSlide]
    if (!carousel || !slide) return

    const syncHeight = () => {
      carousel.style.height = `${slide.offsetHeight}px`
    }
    syncHeight()

    const observer = new ResizeObserver(syncHeight)
    observer.observe(slide)
    return () => observer.disconnect()
  }, [activeSlide, children])

  if (items.length === 0) return null

  function scrollToSlide(index: number) {
    const carousel = carouselRef.current
    if (!carousel) return
    carousel.scrollTo({ left: index * carousel.clientWidth, behavior: "smooth" })
    setActiveSlide(index)
  }

  return (
    <section className={styles.section} aria-label={ariaLabel}>
      <div
        ref={carouselRef}
        className={styles.carousel}
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth
          if (width === 0) return
          const nextSlide = Math.round(event.currentTarget.scrollLeft / width)
          setActiveSlide((currentSlide) => currentSlide === nextSlide ? currentSlide : nextSlide)
        }}
      >
        {items.map((item, index) => (
          <article
            key={item.label}
            ref={(node) => { slideRefs.current[index] = node }}
            className={styles.slide}
            aria-label={`${item.label}, vue ${index + 1} sur ${items.length}`}
          >
            {slides[index] ?? null}
          </article>
        ))}
      </div>

      <nav className={styles.pagination} aria-label={`Choisir une vue : ${ariaLabel}`}>
        <span aria-live="polite">{items[activeSlide]?.label}</span>
        <div>
          {items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-label={`Afficher ${item.label}`}
              aria-current={activeSlide === index ? "page" : undefined}
              onClick={() => scrollToSlide(index)}
            >
              <i aria-hidden="true" />
            </button>
          ))}
        </div>
        <small>{activeSlide + 1} / {items.length}</small>
      </nav>
    </section>
  )
}
