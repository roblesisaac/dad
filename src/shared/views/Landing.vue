<template>
  <div class="min-h-screen bg-white flex flex-col justify-center relative overflow-hidden">
    <!-- Background styling elements -->
    <div class="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
      <div class="absolute right-0 top-0 w-96 h-96 bg-black rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
      <div class="absolute left-0 bottom-0 w-64 h-64 bg-black rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
    </div>

    <div class="max-w-7xl mx-auto w-full px-5 py-20 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        <!-- Left Column: Hero Text -->
        <div class="space-y-8 text-center lg:text-left">
          <div class="inline-block border-2 border-black px-4 py-1 rounded-full font-bold text-sm mb-4 bg-gray-50">
            v1.0 Public Beta
          </div>
          
          <h1 class="text-6xl md:text-8xl font-black tracking-tighter leading-tight text-black">
            Track Every <br class="hidden lg:block" />
            <span class="text-transparent bg-clip-text bg-gradient-to-br from-black to-gray-600">Penny.</span>
          </h1>
          
          <p class="text-xl md:text-2xl text-gray-600 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Minimalist finance tracking for the modern age. 
            No clutter, no ads, just clarity.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
            <button 
              @click="handlePrimaryAction"
              class="group relative px-8 py-4 bg-black text-white text-lg font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-gray-900"
            >
              <span class="flex items-center gap-2">
                {{ isAuthed ? 'Go to Dashboard' : 'Get Started Free' }}
                <ArrowRight class="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
            
            <button 
              v-if="!isAuthed"
              @click="login"
              class="px-8 py-4 bg-white text-black text-lg font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-gray-50"
            >
              Log In
            </button>
          </div>

          <div class="pt-10 flex flex-wrap items-center justify-center lg:justify-start gap-y-4 gap-x-8 text-sm font-bold text-gray-500 uppercase tracking-widest">
             <div class="flex items-center gap-2">
               <ShieldCheck class="w-5 h-5 text-black" />
               <span>Bank-Level Security</span>
             </div>
             <div class="flex items-center gap-2">
               <Zap class="w-5 h-5 text-black" />
               <span>Real-time Sync</span>
             </div>
             <div class="flex items-center gap-2">
               <Lock class="w-5 h-5 text-black" />
               <span>Private First</span>
             </div>
          </div>
        </div>

        <!-- Right Column: Visual/Demo -->
        <div class="relative hidden lg:block perspective-1000">
          <div class="relative z-10 bg-white border-2 border-black rounded-lg p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rotate-y-12 hover:rotate-0 transition-transform duration-700 ease-out max-w-md mx-auto">
            <!-- Mock UI Header -->
            <div class="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
              <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-black"></div>
                <div class="w-3 h-3 rounded-full border border-black"></div>
              </div>
              <div class="font-mono text-sm font-bold">JAN 2026</div>
            </div>
            
            <!-- Mock UI Content -->
            <div class="space-y-4 font-mono">
              <div class="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-black rounded cursor-default">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-black text-white rounded">
                    <ShoppingBag class="w-4 h-4" />
                  </div>
                  <span class="font-bold">Groceries</span>
                </div>
                <span class="font-bold">-$124.50</span>
              </div>

               <div class="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-black rounded cursor-default">
                <div class="flex items-center gap-3">
                  <div class="p-2 border-2 border-black rounded">
                    <Briefcase class="w-4 h-4" />
                  </div>
                  <span class="font-bold">Salary</span>
                </div>
                <span class="text-green-600 font-bold">+$4,250.00</span>
              </div>

               <div class="flex justify-between items-center p-3 hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-black rounded cursor-default">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-gray-100 rounded">
                    <Home class="w-4 h-4" />
                  </div>
                  <span class="font-bold">Rent</span>
                </div>
                <span class="font-bold">-$1,200.00</span>
              </div>

              <div class="mt-6 pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-end">
                <span class="text-gray-500 text-sm font-sans font-bold uppercase tracking-wider">Total Balance</span>
                <span class="text-3xl font-black tracking-tighter">$2,925.50</span>
              </div>
            </div>
          </div>
          
          <!-- Decorative elements behind -->
          <div class="absolute -z-10 top-10 -right-10 w-full h-full border-2 border-black rounded-lg bg-gray-100 opacity-50"></div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuth } from '@/shared/composables/useAuth.js';
import { ArrowRight, ShoppingBag, Briefcase, Home, ShieldCheck, Zap, Lock } from 'lucide-vue-next';

const router = useRouter();
const { isAuthed, login } = useAuth();

const handlePrimaryAction = () => {
  if (isAuthed.value) {
    router.push('/dashboard');
  } else {
    login();
  }
};
</script>