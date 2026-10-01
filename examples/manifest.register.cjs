exports.register = async function register(registry) {
  registry.registerAction('myapp:deployAction', async () => ({ status: 'deployed (via paws)' }))
}
