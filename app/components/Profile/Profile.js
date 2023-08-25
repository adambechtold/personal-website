import Image from 'next/image';
import styles from './Profile.module.css';


export default function Profile() {

  return (
    <div className={styles.container}>
      <Image
        src="/profile-picture.jpeg"
        alt="Profile Picture"
        className={styles.profilePicture}
        width={240}
        height={240}
        priority
      />
      <h1>Adam Bechtold</h1>
    </div>
  )
}
