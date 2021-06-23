<template>
  <div>
      <div>导航</div>
      <nuxt />
  </div>
</template>

<script>
export default {
  data () {
    return {
    };
  },

  components: {},

  computed: {},

  methods: {}
}

</script>
<style lang='scss'>
.container{
  text-align: center;
  .loginForm{
    width: 1000px;
    margin: 0 auto;
    .capation{
      width:850px;
      position: relative;
      .priture{
        position: absolute;
        right: -150px;
        top: 0;
      }
    }
  }
}
</style>