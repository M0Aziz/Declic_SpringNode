/*describe('Notification Page', () => {
  let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWU1Y2M2ZGQzY2Y5NmQ4N2RiMTEzNzIiLCJpYXQiOjE3MTk4NjU0MDQsImV4cCI6MTcyMDEyNDYwNH0.-XtLxXxLd5cQqjF-TIBMWUfK2gdhIm7VLgg3WiJDeC0';

  beforeEach(() => {
    // Utilisez cy.request() pour obtenir la page des notifications
    cy.request({
      method: 'GET',
      url: 'http://localhost:5000/notifications',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });

  it('should display notifications', () => {
    // Vérifiez que la chaîne 'Notifications' est présente dans la réponse
    cy.contains('notifications', { timeout: 10000 }); // Augmenter le timeout si nécessaire
    
    // Vérifiez le nombre d'éléments de notification affichés
    cy.get('.notification-item').should('have.length', 2); // Adapter selon votre application
  });

  it('should mark notification as read', () => {
    // Interaction avec l'UI des notifications
    cy.get('.notification-item')
      .first()
      .find('.mark-as-read-button')
      .click();

    cy.contains('.notification-item', 'Read').should('exist');
  });

  it('should mark all notifications as read', () => {
    // Interaction avec l'UI des notifications
    cy.get('.mark-all-as-read-button').click();

    cy.get('.notification-item').each((notification) => {
      cy.wrap(notification).should('have.class', 'read');
    });
  });
});*/
describe('Notification Page', () => {
  let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWU1Y2M2ZGQzY2Y5NmQ4N2RiMTEzNzIiLCJpYXQiOjE3MTk4NjU0MDQsImV4cCI6MTcyMDEyNDYwNH0.-XtLxXxLd5cQqjF-TIBMWUfK2gdhIm7VLgg3WiJDeC0';

  beforeEach(() => {
    // Faites une requête pour récupérer les notifications
    cy.request({
      method: 'GET',
      url: 'http://localhost:5000/notifications',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).as('notifications'); // Alias pour référencer la réponse
  });

  it('should display notifications', function () {
    // Vérifiez que la requête a réussi
    cy.get('@notifications').its('status').should('eq', 200);

    // Vérifiez que la chaîne 'Notifications' est présente dans la réponse JSON
    cy.get('@notifications').its('body.notifications').should('exist');

    // Vérifiez le nombre d'éléments de notification affichés
    cy.get('@notifications').its('body.notifications').should('have.length', 3); // Adapter selon votre application
  });

  it('should mark notification as read', function () {
    // Interaction avec l'UI des notifications
    cy.get('@notifications').then((response) => {
      const firstNotificationId = response.body.notifications[0]._id;

      // Marquer la première notification comme lue
      cy.request({
        method: 'PUT',
        url: `http://localhost:5000/notifications/${firstNotificationId}/markAsRead`,
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).then((markAsReadResponse) => {
        expect(markAsReadResponse.status).to.eq(200);
       // cy.contains('.notification-item', 'Read').should('exist');
      });
    });
  });

  it('should mark all notifications as read', function () {
    // Récupérer les IDs de toutes les notifications
    cy.get('@notifications').then((response) => {
      const notificationIds = response.body.notifications.map(notification => notification._id);

      // Marquer toutes les notifications comme lues
      cy.request({
        method: 'PUT',
        url: 'http://localhost:5000/notifications/markAllAsRead',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: { notificationIds }
      }).then((markAllAsReadResponse) => {
        expect(markAllAsReadResponse.status).to.eq(200);

        // Vérifier que toutes les notifications sont marquées comme lues
        cy.get('@notifications').its('body.notifications').each((notification) => {
          if (notificationIds.includes(notification._id)) {
            expect(notification.vuByUser).to.be.true;
          }
        });
      });
    });
  });
});
