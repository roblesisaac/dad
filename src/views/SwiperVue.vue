<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
      class="rounded-xl overflow-hidden shadow-lg"
    >
      <swiper-slide class="bg-gray-800 flex items-center justify-center">
        <div class="text-2xl text-white font-medium">Slide 1</div>
      </swiper-slide>
      <swiper-slide class="bg-gray-700 flex items-center justify-center">
        <div class="text-2xl text-white font-medium">Slide 2</div>
      </swiper-slide>
      <swiper-slide class="bg-gray-600 flex items-center justify-center">
        <div class="text-2xl text-white font-medium">Slide 3</div>
      </swiper-slide>
    </swiper>
  </div>
</template>

<script setup>
import { Swiper, SwiperSlide } from "swiper/vue";
import "swiper/css";
import { Autoplay } from "swiper";

const modules = [Autoplay];
</script>

<style>
.swiper-slide {
  @apply h-[300px] transition-all duration-300;
}
</style>