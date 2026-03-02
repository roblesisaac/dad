<template>
  <swiper
    :spaceBetween="30"
    :centeredSlides="true"
    :loop="true"
    :grabCursor="true"
    :autoplay="{
      delay: 5000,
      disableOnInteraction: false,
    }"
    :navigation="true"
    :modules="modules"
    class="mySwiper"
  >
    <swiper-slide class="slide1">Slide 11</swiper-slide>
    <swiper-slide class="slide2">Slide 2</swiper-slide>
    <swiper-slide class="slide3">Slide 3</swiper-slide>
  </swiper>
</template>

<script setup>
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import { Autoplay } from "swiper";

const modules = [Autoplay];
</script>

<style>
  .swiper-slide {
    height: 300px;
    color: var(--theme-swiper-text);
  }
  .slide1 {
    background: var(--theme-swiper-bg);
  }
  .slide2 {
    background: var(--theme-swiper-bg-hover);
  }
  .slide3 {
    background: var(--theme-swiper-bg-active);
  }
</style>
