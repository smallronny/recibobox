import 'dotenv/config';
import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { AuthService } from '../modules/auth/auth.service';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  await AppDataSource.initialize();
  const service = new AuthService();

  try {
    switch (command) {
      case 'password':
      case 'reset': {
        const username = args[1];
        const newPassword = args[2];
        if (!username || !newPassword) {
          console.error('Uso: node dist/scripts/manage-user.js password <usuario> <nueva_contraseña>');
          process.exit(1);
        }
        await service.adminSetPassword(username, newPassword);
        console.log(`✔ Contraseña actualizada exitosamente para el usuario "${username}".`);
        break;
      }

      case 'create': {
        const username = args[1];
        const email = args[2];
        const password = args[3];
        const role = (args[4] as 'admin' | 'operador') || 'operador';

        if (!username || !email || !password) {
          console.error('Uso: node dist/scripts/manage-user.js create <usuario> <email> <contraseña> [admin|operador]');
          process.exit(1);
        }

        const user = await service.createUser({ username, email, password, role });
        console.log(`✔ Usuario creado con éxito:`, user);
        break;
      }

      case 'list': {
        const users = await service.listUsers();
        console.log('--- USUARIOS REGISTRADOS ---');
        console.table(users);
        break;
      }

      default:
        console.log(`
Uso de manage-user:
  node dist/scripts/manage-user.js password <usuario> <nueva_contraseña>
  node dist/scripts/manage-user.js create <usuario> <email> <contraseña> [admin|operador]
  node dist/scripts/manage-user.js list
        `);
        break;
    }
  } catch (err: any) {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

main();

